# ProseMirror Tables: Lessons Learned

## The Problem

When implementing markdown tables in ProseMirror, we encountered a critical issue: **the table layout would completely break when the cursor crossed cell borders**. The visual symptoms included:

- Cells jumping to unexpected positions
- Columns appearing disconnected from the table body
- The entire table re-laying out on each cursor movement

## Root Cause Analysis

### Initial Hypothesis (Wrong)
We initially thought the issue was:
- CSS `table-layout: auto` causing dynamic recalculation
- Table structure having inconsistent column counts between rows
- Missing `fixTables` plugin call

**These were not the root cause.**

### Actual Root Cause
The issue was **GapCursor positions between table cells**. When using arrow keys to navigate, the cursor would land on "gap" positions that exist between cells in the ProseMirror document structure.

Debug logging revealed the pattern:
```
Position 236: parentNode: 'table_header', cellDepth: 3  ✓ Inside cell
Position 237: parentNode: 'table_row', cellDepth: -1    ✗ Between cells (GapCursor)
```

When the cursor landed at position 237:
- `cellDepth: -1` indicated no cell contained the cursor
- `selectionType: "GapCursor"` confirmed it was a gap position
- The browser's table rendering became confused, causing layout jumps

## What Didn't Work

### 1. CSS `table-layout: fixed`
Changed from `auto` to `fixed` thinking browser recalculation was the issue.
```css
.ProseMirror table {
    table-layout: fixed; /* Didn't fix the core issue */
}
```
**Result:** Did not help because the issue was document structure, not CSS.

### 2. `fixTables` Plugin
Called `fixTables(state)` after parsing to normalize table structure.
```typescript
const fixTransaction = fixTables(state);
if (fixTransaction) {
    state = state.apply(fixTransaction);
}
```
**Result:** Useful for fixing malformed tables, but didn't address cursor navigation.

### 3. `normalizeTableColumns` Custom Function
Wrote a function to ensure all rows have the same number of cells.
**Result:** Good for data integrity, but not the root cause of the visual bug.

### 4. Custom Arrow Key Handlers (Partial Success)
Added handlers to skip gap positions:
```typescript
ArrowLeft: handleHorizontalArrow('left'),
ArrowRight: handleHorizontalArrow('right'),
```
**Result:** Didn't work initially because of **plugin order** - `exampleSetup` keymaps were handling arrow keys before our custom handlers.

## What Actually Worked

### Solution 1: GapCursor Fix Plugin (Core Fix)

Created a plugin using `appendTransaction` that intercepts GapCursor selections inside tables and redirects them to valid cell positions:

```typescript
const tableGapCursorFix = new Plugin({
    appendTransaction(transactions, oldState, newState) {
        const selectionChanged = transactions.some(tr => tr.selectionSet);
        if (!selectionChanged) return null;

        const { selection } = newState;

        // Check if this is a GapCursor
        if (selection.constructor.name !== 'GapCursor') return null;

        // Check if we're inside a table
        const $from = selection.$from;
        let tableDepth = -1;
        for (let d = $from.depth; d >= 0; d--) {
            if ($from.node(d).type.name === 'table') {
                tableDepth = d;
                break;
            }
        }
        if (tableDepth < 0) return null; // Not in table, allow GapCursor

        // Determine movement direction from old position
        const pos = $from.pos;
        const oldPos = oldState.selection.$from.pos;
        const movingForward = pos >= oldPos;

        // Search for nearest cell in the direction of movement
        if (movingForward) {
            // Search forward first, then backward
            for (let searchPos = pos; searchPos <= pos + 100; searchPos++) {
                if (isInsideCell(newState.doc.resolve(searchPos))) {
                    return newState.tr.setSelection(
                        TextSelection.create(newState.doc, searchPos)
                    );
                }
            }
        } else {
            // Search backward first, then forward
            for (let searchPos = pos; searchPos >= pos - 100; searchPos--) {
                if (isInsideCell(newState.doc.resolve(searchPos))) {
                    return newState.tr.setSelection(
                        TextSelection.create(newState.doc, searchPos)
                    );
                }
            }
        }
        return null;
    },
});
```

**Key insight:** The direction detection (`movingForward`) is critical - without it, the cursor would always jump to the wrong cell when moving backward.

### Solution 2: Plugin Order (Critical)

The table plugins **MUST come before `exampleSetup`** in the plugin array:

```typescript
// WRONG - exampleSetup handles arrow keys first
plugins: [
    ...exampleSetup({ schema: tableSchema }),
    ...getTablePlugins(), // Too late!
]

// CORRECT - table plugins get first chance at key events
plugins: [
    ...getTablePlugins(), // Handles table navigation first
    ...exampleSetup({ schema: tableSchema }),
]
```

**Why:** ProseMirror processes keymap plugins in order. The first plugin to return `true` wins. `exampleSetup` includes `gapCursor()` which creates GapCursor selections on arrow keys.

### Solution 3: Column-Aware Vertical Navigation

Default arrow key behavior moves through document positions linearly. For tables, users expect up/down to stay in the same column:

```typescript
function handleVerticalArrow(dir: 'up' | 'down'): Command {
    return (state, dispatch) => {
        const info = getTableInfo(state.selection.$from);
        if (!info) return false;

        const { table, tablePos } = info;
        const map = TableMap.get(table);

        // Find current cell's column
        const cellPosRelative = info.cellPos - tablePos - 1;
        const cellIndex = findCellIndex(map, cellPosRelative);
        const currentCol = cellIndex % map.width;
        const currentRow = Math.floor(cellIndex / map.width);

        // Calculate target row
        const targetRow = dir === 'down' ? currentRow + 1 : currentRow - 1;
        if (targetRow < 0 || targetRow >= map.height) return false;

        // Get cell at same column in target row
        const targetCellOffset = map.map[targetRow * map.width + currentCol];
        const targetCellPos = tablePos + 1 + targetCellOffset + 1;

        if (dispatch) {
            dispatch(state.tr.setSelection(
                TextSelection.create(state.doc, targetCellPos)
            ));
        }
        return true;
    };
}
```

**Key insight:** Use `TableMap.get(table)` to understand table structure and calculate column positions.

## Helper Function: isInsideCell

```typescript
function isInsideCell($pos: ResolvedPos): boolean {
    for (let d = $pos.depth; d >= 0; d--) {
        const node = $pos.node(d);
        if (node.type.name === 'table_cell' || node.type.name === 'table_header') {
            return true;
        }
    }
    return false;
}
```

## Final Keymap

```typescript
export const tableKeymap = keymap({
    // Navigation
    Tab: goToNextCell(1),
    "Shift-Tab": goToNextCell(-1),
    ArrowLeft: handleHorizontalArrow('left'),
    ArrowRight: handleHorizontalArrow('right'),
    ArrowUp: handleVerticalArrow('up'),
    ArrowDown: handleVerticalArrow('down'),

    // Row operations
    Enter: handleTableEnter(), // Creates row when in last column
    "Mod-Shift-Backspace": deleteRow,

    // Column operations
    "Mod-Shift-ArrowRight": addColumnAfter,
    "Mod-Shift-ArrowLeft": addColumnBefore,
    "Mod-Alt-Backspace": deleteColumn,

    // Table deletion
    "Mod-Shift-Alt-Backspace": deleteTable,
});
```

## Debugging Tips

### Add Logging to dispatchTransaction
```typescript
dispatchTransaction(transaction) {
    if (transaction.selectionSet) {
        const $from = newState.selection.$from;
        console.log('[TABLE DEBUG]', {
            fromPos: $from.pos,
            parentNode: $from.parent.type.name,
            selectionType: newState.selection.constructor.name,
            cellDepth: findCellDepth($from),
        });
    }
}
```

### Key Things to Log
- `selectionType` - Watch for "GapCursor" inside tables
- `cellDepth` - Should never be -1 when cursor is in table
- `parentNode` - Should be "table_cell" or "table_header", not "table_row"

## File Structure

```
src/components/prosemirror/tables/
├── index.ts          # Exports
├── schema.ts         # Table node types with alignment support
├── parser.ts         # Markdown → ProseMirror
├── serializer.ts     # ProseMirror → Markdown
├── commands.ts       # Navigation, editing commands, and plugins
└── tables.css        # Table styling
```

## Resources

- [ProseMirror Tables GitHub](https://github.com/ProseMirror/prosemirror-tables)
- [GapCursor and Tables Discussion](https://discuss.prosemirror.net/t/gapcursor-and-tables/4278)
- [Table Width Behavior Discussion](https://discuss.prosemirror.net/t/behaviour-of-table-width-and-column-sizes/3396)
