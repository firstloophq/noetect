import { Plugin, PluginKey, EditorState } from "prosemirror-state";
import { EditorView, DecorationSet, Decoration } from "prosemirror-view";
import { Schema } from "prosemirror-model";

/**
 * Plugin state for wiki link suggestions
 */
export interface WikiLinkPluginState {
    active: boolean;
    range: { from: number; to: number } | null;
    query: string;
    selectedIndex: number;
}

export const wikiLinkPluginKey = new PluginKey<WikiLinkPluginState>("wikiLink");

/**
 * Find the [[query]] pattern before the cursor
 */
function findWikiLinkTrigger(
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

    // Look for [[ that isn't closed
    const match = textBefore.match(/\[\[([^\]]*?)$/);
    if (!match) return null;

    const query = match[1];
    const start = $from.pos - query.length - 2; // -2 for [[

    return {
        range: { from: start, to: $from.pos },
        query,
    };
}

export interface WikiLinkPluginOptions {
    schema: Schema;
    onStateChange?: (state: WikiLinkPluginState) => void;
}

/**
 * Create the wiki link suggestion plugin
 */
export function createWikiLinkPlugin(options: WikiLinkPluginOptions): Plugin<WikiLinkPluginState> {
    return new Plugin<WikiLinkPluginState>({
        key: wikiLinkPluginKey,

        state: {
            init(): WikiLinkPluginState {
                return {
                    active: false,
                    range: null,
                    query: "",
                    selectedIndex: 0,
                };
            },

            apply(tr, prev, _oldState, newState): WikiLinkPluginState {
                // Check for explicit metadata to close the popup
                const meta = tr.getMeta(wikiLinkPluginKey);
                if (meta?.close) {
                    const newPluginState: WikiLinkPluginState = {
                        active: false,
                        range: null,
                        query: "",
                        selectedIndex: 0,
                    };
                    options.onStateChange?.(newPluginState);
                    return newPluginState;
                }

                if (meta?.setSelectedIndex !== undefined) {
                    const newPluginState: WikiLinkPluginState = {
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
                const trigger = findWikiLinkTrigger(newState);

                if (trigger) {
                    const newPluginState: WikiLinkPluginState = {
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
                    const newPluginState: WikiLinkPluginState = {
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
                const state = wikiLinkPluginKey.getState(view.state);
                if (!state?.active) return false;

                // Handle arrow keys, enter, escape
                switch (event.key) {
                    case "ArrowDown":
                        event.preventDefault();
                        view.dispatch(
                            view.state.tr.setMeta(wikiLinkPluginKey, {
                                setSelectedIndex: state.selectedIndex + 1,
                            })
                        );
                        return true;

                    case "ArrowUp":
                        event.preventDefault();
                        view.dispatch(
                            view.state.tr.setMeta(wikiLinkPluginKey, {
                                setSelectedIndex: Math.max(0, state.selectedIndex - 1),
                            })
                        );
                        return true;

                    case "Enter":
                    case "Tab":
                        // Let the React component handle selection
                        // It will call insertWikiLink
                        return false;

                    case "Escape":
                        event.preventDefault();
                        view.dispatch(
                            view.state.tr.setMeta(wikiLinkPluginKey, { close: true })
                        );
                        return true;

                    default:
                        return false;
                }
            },

            // Add decorations for the [[ trigger text
            decorations(state) {
                const pluginState = wikiLinkPluginKey.getState(state);
                if (!pluginState?.active || !pluginState.range) {
                    return DecorationSet.empty;
                }

                // Highlight the [[query portion
                const deco = Decoration.inline(
                    pluginState.range.from,
                    pluginState.range.to,
                    { class: "wiki-link-trigger" }
                );

                return DecorationSet.create(state.doc, [deco]);
            },
        },
    });
}

/**
 * Insert a wiki link at the current trigger position
 */
export function insertWikiLink(
    view: EditorView,
    noteName: string,
    displayTitle?: string
): boolean {
    const state = wikiLinkPluginKey.getState(view.state);
    if (!state?.active || !state.range) return false;

    const { from, to } = state.range;
    const schema = view.state.schema;

    // Check if wiki_link node type exists
    const wikiLinkType = schema.nodes.wiki_link;
    if (!wikiLinkType) {
        console.error("wiki_link node type not found in schema");
        return false;
    }

    // Create the wiki link node
    const wikiLinkNode = wikiLinkType.create({
        href: noteName,
        title: displayTitle || noteName,
    });

    // Create a space text node after the wiki link
    const spaceNode = schema.text(" ");

    // Replace the [[query with the wiki link node + space
    const tr = view.state.tr
        .replaceWith(from, to, [wikiLinkNode, spaceNode])
        .setMeta(wikiLinkPluginKey, { close: true });

    view.dispatch(tr);
    view.focus();

    return true;
}

/**
 * Close the wiki link popup without inserting
 */
export function closeWikiLinkPopup(view: EditorView): void {
    view.dispatch(view.state.tr.setMeta(wikiLinkPluginKey, { close: true }));
}

/**
 * Get the current popup position for rendering
 * Returns both top (above line) and bottom (below line) positions for flip behavior
 */
export function getWikiLinkPopupPosition(view: EditorView): {
    top: number;
    bottom: number;
    left: number;
} | null {
    const state = wikiLinkPluginKey.getState(view.state);
    if (!state?.active || !state.range) return null;

    const coords = view.coordsAtPos(state.range.from);
    return {
        top: coords.top,
        bottom: coords.bottom,
        left: coords.left,
    };
}
