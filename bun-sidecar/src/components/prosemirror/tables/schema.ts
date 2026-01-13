import { Schema, NodeSpec } from "prosemirror-model";
import { schema as markdownSchema } from "prosemirror-markdown";
import { tableNodes } from "prosemirror-tables";

/**
 * Table cell alignment type
 */
export type CellAlignment = "left" | "center" | "right" | null;

/**
 * Extended table nodes with alignment support for markdown
 */
const tableNodeSpecs = tableNodes({
    tableGroup: "block",
    cellContent: "inline*",
    cellAttributes: {
        alignment: {
            default: null,
            getFromDOM(dom) {
                const style = (dom as HTMLElement).style.textAlign;
                if (style === "left" || style === "center" || style === "right") {
                    return style;
                }
                return null;
            },
            setDOMAttr(value, attrs) {
                if (value) {
                    attrs.style = (attrs.style || "") + `text-align: ${value};`;
                }
            },
        },
    },
});

/**
 * Wiki link node spec - inline atom node for [[Note Name]] links
 */
const wikiLinkNodeSpec: NodeSpec = {
    group: "inline",
    inline: true,
    atom: true,
    attrs: {
        href: { default: "" },
        title: { default: "" },
    },
    toDOM(node) {
        return [
            "span",
            {
                class: "wiki-link",
                "data-wiki-link": node.attrs.href,
                title: node.attrs.title || node.attrs.href,
            },
            node.attrs.title || node.attrs.href,
        ];
    },
    parseDOM: [
        {
            tag: "span.wiki-link",
            getAttrs(dom) {
                const element = dom as HTMLElement;
                return {
                    href: element.getAttribute("data-wiki-link") || "",
                    title: element.textContent || "",
                };
            },
        },
        {
            // Also parse old <a> wiki links for backwards compatibility
            tag: "a.wiki-link",
            getAttrs(dom) {
                const element = dom as HTMLElement;
                return {
                    href: element.getAttribute("data-wiki-link") || "",
                    title: element.textContent || "",
                };
            },
        },
    ],
};

/**
 * Extended markdown schema with table and wiki link support
 */
export const tableSchema = new Schema({
    nodes: markdownSchema.spec.nodes
        .append(tableNodeSpecs)
        .addBefore("image", "wiki_link", wikiLinkNodeSpec),
    marks: markdownSchema.spec.marks,
});

/**
 * Get node types from the schema for convenience
 */
export const tableNodeTypes = {
    table: tableSchema.nodes.table,
    tableRow: tableSchema.nodes.table_row,
    tableCell: tableSchema.nodes.table_cell,
    tableHeader: tableSchema.nodes.table_header,
};
