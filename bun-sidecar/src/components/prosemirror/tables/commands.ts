import { EditorState, Transaction, Command, Selection, Plugin } from "prosemirror-state";
import { Fragment, Node, ResolvedPos } from "prosemirror-model";
import {
    tableEditing,
    goToNextCell,
    addColumnAfter,
    addColumnBefore,
    deleteColumn,
    addRowAfter,
    addRowBefore,
    deleteRow,
    deleteTable,
    mergeCells,
    splitCell,
    toggleHeaderRow,
    toggleHeaderColumn,
    toggleHeaderCell,
    setCellAttr,
    isInTable,
    CellSelection,
    columnResizing,
    fixTables,
    TableMap,
} from "prosemirror-tables";
import { keymap } from "prosemirror-keymap";
import { TextSelection } from "prosemirror-state";
import { tableSchema, type CellAlignment } from "./schema";

/**
 * Re-export prosemirror-tables utilities for convenience
 */
export {
    tableEditing,
    goToNextCell,
    addColumnAfter,
    addColumnBefore,
    deleteColumn,
    addRowAfter,
    addRowBefore,
    deleteRow,
    deleteTable,
    mergeCells,
    splitCell,
    toggleHeaderRow,
    toggleHeaderColumn,
    toggleHeaderCell,
    setCellAttr,
    isInTable,
    CellSelection,
    columnResizing,
    fixTables,
};

/**
 * Create a new table with specified dimensions
 */
export function createTable(params: {
    rows: number;
    cols: number;
    withHeader?: boolean;
}): Command {
    const { rows, cols, withHeader = true } = params;

    return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
        const { table, table_row, table_cell, table_header } = tableSchema.nodes;

        // Create header row if requested
        const headerCells: Node[] = [];
        for (let i = 0; i < cols; i++) {
            headerCells.push(table_header.createAndFill()!);
        }
        const headerRow = table_row.create(null, Fragment.from(headerCells));

        // Create body rows
        const bodyRows: Node[] = [];
        const actualBodyRows = withHeader ? rows - 1 : rows;

        for (let r = 0; r < actualBodyRows; r++) {
            const cells: Node[] = [];
            for (let c = 0; c < cols; c++) {
                cells.push(table_cell.createAndFill()!);
            }
            bodyRows.push(table_row.create(null, Fragment.from(cells)));
        }

        // Combine rows
        const allRows = withHeader ? [headerRow, ...bodyRows] : bodyRows;
        const tableNode = table.create(null, Fragment.from(allRows));

        if (dispatch) {
            const { selection } = state;
            const tr = state.tr.replaceSelectionWith(tableNode);
            // Move cursor into first cell
            const pos = selection.from + 2; // Inside the first cell
            tr.setSelection(Selection.near(tr.doc.resolve(pos)));
            dispatch(tr.scrollIntoView());
        }

        return true;
    };
}

/**
 * Insert a table at current position
 */
export function insertTable(params: {
    rows?: number;
    cols?: number;
    withHeader?: boolean;
}): Command {
    return createTable({
        rows: params.rows ?? 3,
        cols: params.cols ?? 3,
        withHeader: params.withHeader ?? true,
    });
}

/**
 * Set alignment for selected cells
 */
export function setColumnAlignment(alignment: CellAlignment): Command {
    return setCellAttr("alignment", alignment);
}

/**
 * Check if a position is inside a table cell (not at a gap position)
 */
function isInsideCell($pos: ResolvedPos): boolean {
    for (let d = $pos.depth; d >= 0; d--) {
        const node = $pos.node(d);
        if (node.type.name === 'table_cell' || node.type.name === 'table_header') {
            return true;
        }
    }
    return false;
}

/**
 * Get table info for a position - returns table node, position, and cell info
 */
function getTableInfo($pos: ResolvedPos): {
    table: Node;
    tablePos: number;
    tableDepth: number;
    cellPos: number;
    cellDepth: number;
} | null {
    let tableDepth = -1;
    let cellDepth = -1;

    for (let d = $pos.depth; d >= 0; d--) {
        const node = $pos.node(d);
        if (node.type.name === 'table') tableDepth = d;
        if (node.type.name === 'table_cell' || node.type.name === 'table_header') cellDepth = d;
    }

    if (tableDepth < 0 || cellDepth < 0) return null;

    return {
        table: $pos.node(tableDepth),
        tablePos: $pos.before(tableDepth),
        tableDepth,
        cellPos: $pos.before(cellDepth),
        cellDepth,
    };
}

/**
 * Handle vertical arrow navigation - moves to same column in adjacent row
 */
function handleVerticalArrow(dir: 'up' | 'down'): Command {
    return (state, dispatch) => {
        const { $from } = state.selection;
        const info = getTableInfo($from);

        if (!info) return false;

        const { table, tablePos } = info;
        const map = TableMap.get(table);

        // Find current cell in the table map
        const cellPosRelative = info.cellPos - tablePos - 1; // Relative to table start

        // Find the cell in the map - need to search because positions might not match exactly
        let cellIndex = -1;
        for (let i = 0; i < map.map.length; i++) {
            if (map.map[i] === cellPosRelative) {
                cellIndex = i;
                break;
            }
        }

        // If exact match not found, find the cell that contains this position
        if (cellIndex < 0) {
            for (let i = 0; i < map.map.length; i++) {
                const cellStart = map.map[i];
                const nextCellStart = map.map[i + 1] ?? table.nodeSize;
                if (cellPosRelative >= cellStart && cellPosRelative < nextCellStart) {
                    cellIndex = i;
                    break;
                }
            }
        }

        if (cellIndex < 0) return false;

        // Calculate current row and column
        const currentRow = Math.floor(cellIndex / map.width);
        const currentCol = cellIndex % map.width;

        // Calculate target row
        const targetRow = dir === 'down' ? currentRow + 1 : currentRow - 1;

        // Check bounds
        if (targetRow < 0 || targetRow >= map.height) {
            return false; // Exit table, let default behavior handle
        }

        // Get the cell at the same column in the target row
        const targetCellIndex = targetRow * map.width + currentCol;
        const targetCellOffset = map.map[targetCellIndex];

        if (targetCellOffset === undefined) return false;

        // Calculate absolute position and move cursor there
        const targetCellPos = tablePos + 1 + targetCellOffset;

        if (dispatch) {
            // Move to the start of the target cell's content
            const $cell = state.doc.resolve(targetCellPos);
            const cellNode = $cell.nodeAfter;
            if (cellNode) {
                // Position inside the cell (after the cell node start)
                const insidePos = targetCellPos + 1;
                const tr = state.tr.setSelection(TextSelection.create(state.doc, insidePos));
                dispatch(tr.scrollIntoView());
            }
        }

        return true;
    };
}

/**
 * Arrow key handler that skips gap positions between table cells (horizontal)
 */
function handleHorizontalArrow(dir: 'left' | 'right'): Command {
    return (state, dispatch) => {
        const { $from } = state.selection;

        // Only handle if we're in a table
        let inTable = false;
        for (let d = $from.depth; d >= 0; d--) {
            if ($from.node(d).type.name === 'table') {
                inTable = true;
                break;
            }
        }
        if (!inTable) return false;

        const delta = dir === 'left' ? -1 : 1;

        // For horizontal movement, check if we'd land on a gap position
        let nextPos = $from.pos + delta;

        // Bounds check
        if (nextPos < 0 || nextPos > state.doc.content.size) {
            return false;
        }

        const $next = state.doc.resolve(nextPos);

        // If next position is not inside a cell, skip to the next valid position
        if (!isInsideCell($next)) {
            // Keep moving in the same direction until we find a cell or exit table
            let searchPos = nextPos;
            const maxIterations = 20; // Safety limit

            for (let i = 0; i < maxIterations; i++) {
                searchPos += delta;

                if (searchPos < 0 || searchPos > state.doc.content.size) {
                    return false; // Let default behavior handle
                }

                const $search = state.doc.resolve(searchPos);

                // Check if we've exited the table
                let stillInTable = false;
                for (let d = $search.depth; d >= 0; d--) {
                    if ($search.node(d).type.name === 'table') {
                        stillInTable = true;
                        break;
                    }
                }

                if (!stillInTable) {
                    // Exited table, let default behavior handle
                    return false;
                }

                if (isInsideCell($search)) {
                    // Found a valid cell position
                    if (dispatch) {
                        const tr = state.tr.setSelection(TextSelection.create(state.doc, searchPos));
                        dispatch(tr.scrollIntoView());
                    }
                    return true;
                }
            }
        }

        // Position is valid, let default behavior handle
        return false;
    };
}

/**
 * Handle Enter key in tables - creates new row when in last cell
 */
function handleTableEnter(): Command {
    return (state, dispatch) => {
        const { $from } = state.selection;
        const info = getTableInfo($from);

        if (!info) return false; // Not in a table cell

        const { table, tablePos } = info;
        const map = TableMap.get(table);

        // Find current cell in the table map
        const cellPosRelative = info.cellPos - tablePos - 1;

        let cellIndex = -1;
        for (let i = 0; i < map.map.length; i++) {
            if (map.map[i] === cellPosRelative) {
                cellIndex = i;
                break;
            }
        }

        if (cellIndex < 0) {
            // Try fuzzy match
            for (let i = 0; i < map.map.length; i++) {
                const cellStart = map.map[i];
                const nextCellStart = map.map[i + 1] ?? table.nodeSize;
                if (cellPosRelative >= cellStart && cellPosRelative < nextCellStart) {
                    cellIndex = i;
                    break;
                }
            }
        }

        if (cellIndex < 0) return false;

        // Calculate current column (row not needed for last-column check)
        const currentCol = cellIndex % map.width;

        // Check if we're in the last cell of a row (rightmost column)
        const isLastColumn = currentCol === map.width - 1;

        if (isLastColumn) {
            // Create a new row after current row
            if (dispatch) {
                return addRowAfter(state, dispatch);
            }
            return true;
        }

        // Not in last cell, let default Enter behavior happen (newline in cell)
        return false;
    };
}

/**
 * Default table keymap for navigation and editing
 */
export const tableKeymap = keymap({
    // Navigation
    Tab: goToNextCell(1),
    "Shift-Tab": goToNextCell(-1),
    ArrowLeft: handleHorizontalArrow('left'),
    ArrowRight: handleHorizontalArrow('right'),
    ArrowUp: handleVerticalArrow('up'),
    ArrowDown: handleVerticalArrow('down'),

    // Row operations
    Enter: handleTableEnter(),
    "Mod-Shift-Backspace": deleteRow,

    // Column operations
    "Mod-Shift-ArrowRight": addColumnAfter,
    "Mod-Shift-ArrowLeft": addColumnBefore,
    "Mod-Alt-Backspace": deleteColumn,

    // Table deletion
    "Mod-Shift-Alt-Backspace": deleteTable,
});

/**
 * Plugin that prevents GapCursor from appearing inside tables.
 * When a GapCursor is detected at a table row/cell boundary, it moves
 * the selection to the nearest valid cell position.
 */
const tableGapCursorFix = new Plugin({
    appendTransaction(transactions, oldState, newState) {
        // Check if selection changed
        const selectionChanged = transactions.some(tr => tr.selectionSet);
        if (!selectionChanged) return null;

        const { selection } = newState;
        const $from = selection.$from;

        // Check if this is a GapCursor (selection where $from.parent is not text-containing)
        // GapCursor has a specific constructor name
        if (selection.constructor.name !== 'GapCursor') return null;

        // Check if we're inside a table
        let tableDepth = -1;
        for (let d = $from.depth; d >= 0; d--) {
            if ($from.node(d).type.name === 'table') {
                tableDepth = d;
                break;
            }
        }

        if (tableDepth < 0) return null; // Not in a table, let GapCursor work normally

        // We have a GapCursor inside a table - find the nearest cell position
        const pos = $from.pos;
        const oldPos = oldState.selection.$from.pos;

        // Determine movement direction
        const movingForward = pos >= oldPos;

        // Search in the direction of movement first
        if (movingForward) {
            // Moving forward (right/down) - search forward first
            for (let searchPos = pos; searchPos <= Math.min(pos + 100, newState.doc.content.size); searchPos++) {
                const $search = newState.doc.resolve(searchPos);
                if (isInsideCell($search)) {
                    return newState.tr.setSelection(TextSelection.create(newState.doc, searchPos));
                }
            }
            // Fallback: search backward
            for (let searchPos = pos - 1; searchPos >= Math.max(pos - 100, 0); searchPos--) {
                const $search = newState.doc.resolve(searchPos);
                if (isInsideCell($search)) {
                    return newState.tr.setSelection(TextSelection.create(newState.doc, searchPos));
                }
            }
        } else {
            // Moving backward (left/up) - search backward first
            for (let searchPos = pos; searchPos >= Math.max(pos - 100, 0); searchPos--) {
                const $search = newState.doc.resolve(searchPos);
                if (isInsideCell($search)) {
                    return newState.tr.setSelection(TextSelection.create(newState.doc, searchPos));
                }
            }
            // Fallback: search forward
            for (let searchPos = pos + 1; searchPos <= Math.min(pos + 100, newState.doc.content.size); searchPos++) {
                const $search = newState.doc.resolve(searchPos);
                if (isInsideCell($search)) {
                    return newState.tr.setSelection(TextSelection.create(newState.doc, searchPos));
                }
            }
        }

        return null;
    },
});

/**
 * Get all table-related plugins
 */
export function getTablePlugins() {
    return [
        tableGapCursorFix, // Must come first to catch GapCursor before rendering
        tableKeymap,
        tableEditing(),
        // Note: columnResizing() is available but omitted for markdown tables
        // as markdown doesn't support column widths
    ];
}

/**
 * Apply table fixes to a document to ensure consistency
 * Call this after parsing a document to fix any structural issues
 */
export function applyTableFixes(state: EditorState): Transaction | undefined {
    return fixTables(state);
}

/**
 * Normalize table column counts - ensures all rows have the same number of cells.
 * This is more aggressive than fixTables and handles parsed markdown tables
 * that may have inconsistent column counts.
 */
export function normalizeTableColumns(state: EditorState): Transaction | undefined {
    let tr: Transaction | undefined;

    state.doc.descendants((node, pos) => {
        if (node.type.name !== "table") return true;

        // Find the maximum column count across all rows
        let maxCols = 0;
        node.forEach((row) => {
            let rowCols = 0;
            row.forEach((cell) => {
                rowCols += (cell.attrs.colspan as number) || 1;
            });
            maxCols = Math.max(maxCols, rowCols);
        });

        if (maxCols === 0) return true;

        // Check each row and add cells if needed
        node.forEach((row, rowOffset) => {
            let currentCols = 0;
            row.forEach((cell) => {
                currentCols += (cell.attrs.colspan as number) || 1;
            });

            const missingCols = maxCols - currentCols;
            if (missingCols > 0) {
                // Determine cell type based on first cell in row
                const isHeader = row.firstChild?.type.name === "table_header";
                const cellType = isHeader
                    ? tableSchema.nodes.table_header
                    : tableSchema.nodes.table_cell;

                // Calculate position at end of row (before row close)
                const rowPos = pos + 1 + rowOffset; // +1 for table open
                const rowEndPos = rowPos + row.nodeSize - 1; // -1 to be before row close

                if (!tr) {
                    tr = state.tr;
                }

                // Insert missing cells
                for (let i = 0; i < missingCols; i++) {
                    const emptyCell = cellType.createAndFill();
                    if (emptyCell) {
                        tr.insert(tr.mapping.map(rowEndPos), emptyCell);
                    }
                }
            }
        });

        return true;
    });

    return tr;
}

/**
 * Check if current selection is in a table
 */
export function selectionInTable(state: EditorState): boolean {
    return isInTable(state);
}

/**
 * Get menu items for table operations (for use in toolbars)
 */
export interface TableMenuItem {
    label: string;
    command: Command;
    isActive?: (state: EditorState) => boolean;
    isDisabled?: (state: EditorState) => boolean;
}

export function getTableMenuItems(): TableMenuItem[] {
    return [
        {
            label: "Insert Table",
            command: insertTable({ rows: 3, cols: 3 }),
            isDisabled: (state) => isInTable(state),
        },
        {
            label: "Add Column Before",
            command: addColumnBefore,
            isDisabled: (state) => !isInTable(state),
        },
        {
            label: "Add Column After",
            command: addColumnAfter,
            isDisabled: (state) => !isInTable(state),
        },
        {
            label: "Delete Column",
            command: deleteColumn,
            isDisabled: (state) => !isInTable(state),
        },
        {
            label: "Add Row Before",
            command: addRowBefore,
            isDisabled: (state) => !isInTable(state),
        },
        {
            label: "Add Row After",
            command: addRowAfter,
            isDisabled: (state) => !isInTable(state),
        },
        {
            label: "Delete Row",
            command: deleteRow,
            isDisabled: (state) => !isInTable(state),
        },
        {
            label: "Delete Table",
            command: deleteTable,
            isDisabled: (state) => !isInTable(state),
        },
        {
            label: "Toggle Header Row",
            command: toggleHeaderRow,
            isDisabled: (state) => !isInTable(state),
        },
        {
            label: "Align Left",
            command: setColumnAlignment("left"),
            isDisabled: (state) => !isInTable(state),
        },
        {
            label: "Align Center",
            command: setColumnAlignment("center"),
            isDisabled: (state) => !isInTable(state),
        },
        {
            label: "Align Right",
            command: setColumnAlignment("right"),
            isDisabled: (state) => !isInTable(state),
        },
    ];
}
