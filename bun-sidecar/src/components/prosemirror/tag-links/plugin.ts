import { Plugin, PluginKey, EditorState } from "prosemirror-state";
import { EditorView, DecorationSet, Decoration } from "prosemirror-view";
import type { Node as PMNode } from "prosemirror-model";

/**
 * Plugin state for tag suggestions
 */
export interface TagLinkPluginState {
    active: boolean;
    range: { from: number; to: number } | null;
    query: string;
    selectedIndex: number;
}

export const tagLinkPluginKey = new PluginKey<TagLinkPluginState>("tagLink");

// Regex to find completed tags in document (for decoration)
// Matches #tag followed by word boundary (space, punctuation, end of line)
const COMPLETED_TAG_REGEX = /(?:^|[\s\[\(])#([a-zA-Z_][a-zA-Z0-9_-]*)/g;

/**
 * Find all completed tags in a text block and return their positions
 */
function findTagsInNode(node: PMNode, pos: number): Array<{ from: number; to: number; tag: string }> {
    const tags: Array<{ from: number; to: number; tag: string }> = [];

    if (!node.isTextblock) return tags;

    const text = node.textContent;
    COMPLETED_TAG_REGEX.lastIndex = 0;

    let match;
    while ((match = COMPLETED_TAG_REGEX.exec(text)) !== null) {
        const tag = match[1];
        if (!tag) continue;

        // Calculate positions - account for the prefix (space/bracket) before #
        const prefixLength = match[0].length - tag.length - 1; // -1 for #
        const tagStart = pos + 1 + match.index + prefixLength; // +1 for node start offset
        const tagEnd = tagStart + tag.length + 1; // +1 for #

        tags.push({ from: tagStart, to: tagEnd, tag });
    }

    return tags;
}

/**
 * Build decorations for all tags in the document
 */
function buildTagDecorations(doc: PMNode): DecorationSet {
    const decorations: Decoration[] = [];

    doc.descendants((node, pos) => {
        const tags = findTagsInNode(node, pos);
        for (const { from, to } of tags) {
            decorations.push(
                Decoration.inline(from, to, { class: "tag-link" })
            );
        }
    });

    return DecorationSet.create(doc, decorations);
}

// Plugin key for tag decorations (separate from suggestion state)
export const tagDecorationPluginKey = new PluginKey<DecorationSet>("tagDecoration");

/**
 * Create the tag decoration plugin (highlights completed tags)
 */
export function createTagDecorationPlugin(): Plugin<DecorationSet> {
    return new Plugin<DecorationSet>({
        key: tagDecorationPluginKey,

        state: {
            init(_, state): DecorationSet {
                return buildTagDecorations(state.doc);
            },

            apply(tr, decorations): DecorationSet {
                if (tr.docChanged) {
                    return buildTagDecorations(tr.doc);
                }
                return decorations.map(tr.mapping, tr.doc);
            },
        },

        props: {
            decorations(state) {
                return tagDecorationPluginKey.getState(state);
            },

            handleKeyDown(view, event) {
                // Handle backspace for atomic tag deletion
                if (event.key !== "Backspace") return false;

                const { state } = view;
                const { $from } = state.selection;

                // Only handle if selection is collapsed (cursor, not range)
                if (!state.selection.empty) return false;

                // Check if cursor is right after a tag
                if (!$from.parent.isTextblock) return false;

                const textBefore = $from.parent.textBetween(
                    0,
                    $from.parentOffset,
                    undefined,
                    "\ufffc"
                );

                // Match a complete tag at the end (cursor right after tag)
                const tagMatch = textBefore.match(/(?:^|[\s\[\(])#([a-zA-Z_][a-zA-Z0-9_-]*)$/);
                if (!tagMatch) return false;

                // Calculate the position to delete from
                // Delete the # and tag name, but not the prefix (space/bracket)
                const deleteFrom = $from.pos - tagMatch[1].length - 1; // -1 for #
                const deleteTo = $from.pos;

                // Don't delete the prefix (space/bracket)
                const tr = state.tr.delete(deleteFrom, deleteTo);
                view.dispatch(tr);

                event.preventDefault();
                return true;
            },
        },
    });
}

/**
 * Find the #tag pattern before the cursor
 */
function findTagTrigger(
    state: EditorState
): { range: { from: number; to: number }; query: string } | null {
    const { $from } = state.selection;

    // Only work in text nodes
    if (!$from.parent.isTextblock) return null;

    // Get text from start of block to cursor
    const textBefore = $from.parent.textBetween(
        0,
        $from.parentOffset,
        undefined,
        "\ufffc"
    );

    // Look for # that starts a tag (not in the middle of a word)
    // Match # followed by optional tag characters
    const match = textBefore.match(/(?:^|[\s\[\(])#([a-zA-Z_][a-zA-Z0-9_-]*)?$/);
    if (!match) return null;

    const query = match[1] || "";
    // Calculate start position: account for the space/bracket before # if present
    const start = $from.pos - query.length - 1; // -1 for the #

    return {
        range: { from: start, to: $from.pos },
        query,
    };
}

export interface TagLinkPluginOptions {
    onStateChange?: (state: TagLinkPluginState) => void;
}

/**
 * Create the tag link suggestion plugin
 */
export function createTagLinkPlugin(options: TagLinkPluginOptions): Plugin<TagLinkPluginState> {
    return new Plugin<TagLinkPluginState>({
        key: tagLinkPluginKey,

        state: {
            init(): TagLinkPluginState {
                return {
                    active: false,
                    range: null,
                    query: "",
                    selectedIndex: 0,
                };
            },

            apply(tr, prev, _oldState, newState): TagLinkPluginState {
                // Check for explicit metadata to close the popup
                const meta = tr.getMeta(tagLinkPluginKey);
                if (meta?.close) {
                    const newPluginState: TagLinkPluginState = {
                        active: false,
                        range: null,
                        query: "",
                        selectedIndex: 0,
                    };
                    options.onStateChange?.(newPluginState);
                    return newPluginState;
                }

                if (meta?.setSelectedIndex !== undefined) {
                    const newPluginState: TagLinkPluginState = {
                        ...prev,
                        selectedIndex: meta.setSelectedIndex,
                    };
                    options.onStateChange?.(newPluginState);
                    return newPluginState;
                }

                // Check if selection changed or document changed
                if (!tr.selectionSet && !tr.docChanged) {
                    return prev;
                }

                // Find trigger pattern
                const trigger = findTagTrigger(newState);

                if (trigger) {
                    const newPluginState: TagLinkPluginState = {
                        active: true,
                        range: trigger.range,
                        query: trigger.query,
                        selectedIndex: prev.query !== trigger.query ? 0 : prev.selectedIndex,
                    };
                    options.onStateChange?.(newPluginState);
                    return newPluginState;
                }

                // No trigger found
                if (prev.active) {
                    const newPluginState: TagLinkPluginState = {
                        active: false,
                        range: null,
                        query: "",
                        selectedIndex: 0,
                    };
                    options.onStateChange?.(newPluginState);
                    return newPluginState;
                }

                return prev;
            },
        },

        props: {
            handleKeyDown(view, event) {
                const state = tagLinkPluginKey.getState(view.state);
                if (!state?.active) return false;

                // Handle arrow keys, enter, escape
                switch (event.key) {
                    case "ArrowDown":
                        event.preventDefault();
                        view.dispatch(
                            view.state.tr.setMeta(tagLinkPluginKey, {
                                setSelectedIndex: state.selectedIndex + 1,
                            })
                        );
                        return true;

                    case "ArrowUp":
                        event.preventDefault();
                        view.dispatch(
                            view.state.tr.setMeta(tagLinkPluginKey, {
                                setSelectedIndex: Math.max(0, state.selectedIndex - 1),
                            })
                        );
                        return true;

                    case "Enter":
                    case "Tab":
                        // Let the React component handle selection
                        // It will call insertTagLink
                        return false;

                    case "Escape":
                        event.preventDefault();
                        view.dispatch(
                            view.state.tr.setMeta(tagLinkPluginKey, { close: true })
                        );
                        return true;

                    default:
                        return false;
                }
            },

            // Add decorations for the # trigger text
            decorations(state) {
                const pluginState = tagLinkPluginKey.getState(state);
                if (!pluginState?.active || !pluginState.range) {
                    return DecorationSet.empty;
                }

                // Highlight the #query portion
                const deco = Decoration.inline(
                    pluginState.range.from,
                    pluginState.range.to,
                    { class: "tag-link-trigger" }
                );

                return DecorationSet.create(state.doc, [deco]);
            },
        },
    });
}

/**
 * Insert a tag at the current trigger position
 */
export function insertTagLink(
    view: EditorView,
    tagName: string
): boolean {
    const state = tagLinkPluginKey.getState(view.state);
    if (!state?.active || !state.range) return false;

    const { from, to } = state.range;
    const schema = view.state.schema;

    // Create the tag text with # prefix
    const tagText = `#${tagName}`;
    const tagNode = schema.text(tagText);

    // Create a space text node after the tag
    const spaceNode = schema.text(" ");

    // Replace the #query with the complete tag + space
    const tr = view.state.tr
        .replaceWith(from, to, [tagNode, spaceNode])
        .setMeta(tagLinkPluginKey, { close: true });

    view.dispatch(tr);
    view.focus();

    return true;
}

/**
 * Close the tag link popup without inserting
 */
export function closeTagLinkPopup(view: EditorView): void {
    view.dispatch(view.state.tr.setMeta(tagLinkPluginKey, { close: true }));
}

/**
 * Get the current popup position for rendering
 * Returns both top (above line) and bottom (below line) positions for flip behavior
 */
export function getTagLinkPopupPosition(view: EditorView): {
    top: number;
    bottom: number;
    left: number;
} | null {
    const state = tagLinkPluginKey.getState(view.state);
    if (!state?.active || !state.range) return null;

    const coords = view.coordsAtPos(state.range.from);
    return {
        top: coords.top,
        bottom: coords.bottom,
        left: coords.left,
    };
}
