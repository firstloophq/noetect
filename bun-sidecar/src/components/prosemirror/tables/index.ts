/**
 * ProseMirror Tables with Markdown Support
 *
 * This module provides a complete solution for markdown tables in ProseMirror:
 * - Extended schema with table nodes (table, table_row, table_cell, table_header)
 * - Markdown parser that handles GFM table syntax
 * - Markdown serializer that outputs properly formatted GFM tables
 * - Table editing commands and keyboard shortcuts
 *
 * Usage:
 * ```typescript
 * import {
 *   tableSchema,
 *   tableMarkdownParser,
 *   tableMarkdownSerializer,
 *   getTablePlugins,
 * } from "@/components/prosemirror/tables";
 *
 * const state = EditorState.create({
 *   doc: tableMarkdownParser.parse(markdownContent),
 *   plugins: [
 *     ...getTablePlugins(),
 *     ...otherPlugins,
 *   ],
 * });
 *
 * // Serialize back to markdown
 * const markdown = tableMarkdownSerializer.serialize(state.doc);
 * ```
 */

// Schema
export { tableSchema, tableNodeTypes, type CellAlignment } from "./schema";

// Parser
export { tableMarkdownParser, parseMarkdown } from "./parser";

// Serializer
export { tableMarkdownSerializer, serializeMarkdown } from "./serializer";

// Commands and plugins
export {
    // Plugin setup
    getTablePlugins,
    tableKeymap,
    tableEditing,
    columnResizing,
    fixTables,
    normalizeTableColumns,
    // Table creation
    createTable,
    insertTable,
    // Column operations
    addColumnAfter,
    addColumnBefore,
    deleteColumn,
    // Row operations
    addRowAfter,
    addRowBefore,
    deleteRow,
    // Table operations
    deleteTable,
    mergeCells,
    splitCell,
    // Header toggles
    toggleHeaderRow,
    toggleHeaderColumn,
    toggleHeaderCell,
    // Cell attributes
    setCellAttr,
    setColumnAlignment,
    // Navigation
    goToNextCell,
    // Utilities
    isInTable,
    selectionInTable,
    CellSelection,
    // Menu helpers
    getTableMenuItems,
    type TableMenuItem,
} from "./commands";
