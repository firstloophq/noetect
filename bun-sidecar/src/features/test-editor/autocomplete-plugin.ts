import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export const autocompletePluginKey = new PluginKey("autocomplete");

interface AutocompleteState {
    suggestion: string | null;
    triggerPos: number | null;
}

/**
 * Creates a ProseMirror plugin that shows ghost text autocomplete suggestions.
 * Press Tab to accept the suggestion.
 */
export function createAutocompletePlugin() {
    return new Plugin<AutocompleteState>({
        key: autocompletePluginKey,

        state: {
            init(): AutocompleteState {
                return { suggestion: null, triggerPos: null };
            },

            apply(tr, state, _oldState, newState): AutocompleteState {
                // Check if we should show a suggestion
                const { selection } = newState;
                const { $from } = selection;

                // Only show suggestions when cursor is at end of a text node
                if (!selection.empty) {
                    return { suggestion: null, triggerPos: null };
                }

                // Get the text before the cursor in the current block
                const textBefore = $from.parent.textBetween(
                    0,
                    $from.parentOffset,
                    undefined,
                    "\ufffc"
                );

                // Check if the text ends with "lor" (case insensitive)
                const triggerMatch = textBefore.match(/\blor$/i);

                if (triggerMatch) {
                    return {
                        suggestion: "em ipsum dolor sit amet, consectetur adipiscing elit",
                        triggerPos: $from.pos,
                    };
                }

                return { suggestion: null, triggerPos: null };
            },
        },

        props: {
            decorations(state) {
                const pluginState = autocompletePluginKey.getState(state);
                if (!pluginState?.suggestion || pluginState.triggerPos === null) {
                    return DecorationSet.empty;
                }

                // Create a widget decoration for the ghost text
                const widget = Decoration.widget(
                    pluginState.triggerPos,
                    () => {
                        const span = document.createElement("span");
                        span.className = "autocomplete-ghost";
                        span.textContent = pluginState.suggestion;
                        return span;
                    },
                    { side: 1 } // Place after the cursor position
                );

                return DecorationSet.create(state.doc, [widget]);
            },

            handleKeyDown(view, event) {
                const pluginState = autocompletePluginKey.getState(view.state);

                // Tab to accept suggestion
                if (event.key === "Tab" && pluginState?.suggestion) {
                    event.preventDefault();

                    const { state, dispatch } = view;
                    const tr = state.tr.insertText(
                        pluginState.suggestion,
                        pluginState.triggerPos
                    );
                    dispatch(tr);
                    return true;
                }

                // Escape to dismiss suggestion
                if (event.key === "Escape" && pluginState?.suggestion) {
                    // Force a transaction to re-evaluate state
                    const { state, dispatch } = view;
                    dispatch(state.tr);
                    return true;
                }

                return false;
            },
        },
    });
}
