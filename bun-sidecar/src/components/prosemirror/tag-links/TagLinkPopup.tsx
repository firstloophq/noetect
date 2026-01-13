import React, { useEffect, useState, useCallback, useRef } from "react";
import { EditorView } from "prosemirror-view";
import { createPortal } from "react-dom";
import {
    TagLinkPluginState,
    tagLinkPluginKey,
    insertTagLink,
    getTagLinkPopupPosition,
} from "./plugin";
import { notesAPI } from "@/hooks/useNotesAPI";
import type { TagSuggestion } from "@/features/notes/tags-types";
import { useTheme } from "@/hooks/useTheme";

interface TagLinkPopupProps {
    view: EditorView;
    pluginState: TagLinkPluginState;
}

/**
 * Filter and sort tags by query match
 */
function filterTags(tags: TagSuggestion[], query: string): TagSuggestion[] {
    if (!query) {
        // Return all tags sorted by count
        return tags.slice(0, 15);
    }

    const queryLower = query.toLowerCase();

    return tags
        .filter((t) => t.tag.toLowerCase().startsWith(queryLower))
        .slice(0, 15);
}

export function TagLinkPopup({ view, pluginState }: TagLinkPopupProps) {
    const { currentTheme } = useTheme();
    const [allTags, setAllTags] = useState<TagSuggestion[]>([]);
    const [filteredTags, setFilteredTags] = useState<TagSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const popupRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<HTMLDivElement>(null);

    // Load tags on mount
    useEffect(() => {
        let mounted = true;

        async function loadTags() {
            try {
                const tags = await notesAPI.getAllTags();
                if (mounted) {
                    setAllTags(tags);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Failed to load tags:", error);
                if (mounted) setLoading(false);
            }
        }

        loadTags();
        return () => {
            mounted = false;
        };
    }, []);

    // Filter tags when query changes
    useEffect(() => {
        const filtered = filterTags(allTags, pluginState.query);
        setFilteredTags(filtered);
    }, [allTags, pluginState.query]);

    // Scroll selected item into view
    useEffect(() => {
        selectedRef.current?.scrollIntoView({ block: "nearest" });
    }, [pluginState.selectedIndex]);

    // Handle selection
    const handleSelect = useCallback(
        (tag: TagSuggestion) => {
            insertTagLink(view, tag.tag);
        },
        [view]
    );

    // Handle creating new tag
    const handleCreateNew = useCallback(() => {
        if (pluginState.query) {
            insertTagLink(view, pluginState.query);
        }
    }, [view, pluginState.query]);

    // Use a ref to always have latest state for the event handler
    const pluginStateRef = useRef(pluginState);
    pluginStateRef.current = pluginState;

    const filteredTagsRef = useRef(filteredTags);
    filteredTagsRef.current = filteredTags;

    // Flag to prevent double-handling during async state updates
    const handledRef = useRef(false);

    // Reset handled flag when popup becomes active
    useEffect(() => {
        if (pluginState.active) {
            handledRef.current = false;
        }
    }, [pluginState.active]);

    // Handle keyboard events
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            // Prevent double-handling
            if (handledRef.current) return;

            const currentState = pluginStateRef.current;
            const currentTags = filteredTagsRef.current;

            // Only handle when popup is actually active
            if (!currentState.active) return;

            if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();
                event.stopPropagation();

                // Mark as handled immediately to prevent race conditions
                handledRef.current = true;

                const selectedIndex = Math.min(
                    currentState.selectedIndex,
                    Math.max(0, currentTags.length - 1)
                );

                if (currentTags[selectedIndex]) {
                    handleSelect(currentTags[selectedIndex]);
                } else if (currentState.query) {
                    handleCreateNew();
                }
            }
        }

        // Only add listener when popup is active
        if (pluginState.active) {
            document.addEventListener("keydown", handleKeyDown, true);
            return () => document.removeEventListener("keydown", handleKeyDown, true);
        }
    }, [pluginState.active, handleSelect, handleCreateNew]);

    // Get popup position
    const position = getTagLinkPopupPosition(view);
    if (!position || !pluginState.active) return null;

    // Clamp selected index
    const selectedIndex = Math.min(
        pluginState.selectedIndex,
        Math.max(0, filteredTags.length - 1)
    );

    // Determine if popup should flip above the cursor
    // Flip when cursor is in the bottom 40% of the viewport
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
    const flipThreshold = viewportHeight * 0.6;
    const shouldFlipAbove = position.bottom > flipThreshold;

    const popupContent = (
        <div
            ref={popupRef}
            className="fixed z-50 min-w-[250px] max-w-[350px] max-h-[300px] overflow-y-auto rounded-lg shadow-lg border"
            style={{
                // When flipping above, anchor to top of cursor and translate up by 100% of popup height
                top: shouldFlipAbove ? position.top : position.bottom + 4,
                left: position.left,
                transform: shouldFlipAbove ? "translateY(calc(-100% - 4px))" : undefined,
                backgroundColor: currentTheme.styles.surfaceSecondary,
                borderColor: currentTheme.styles.borderDefault,
            }}
        >
            {loading ? (
                <div
                    className="p-3 text-sm"
                    style={{ color: currentTheme.styles.contentSecondary }}
                >
                    Loading tags...
                </div>
            ) : filteredTags.length === 0 ? (
                <div className="p-2">
                    {pluginState.query && (
                        <div
                            className="p-2 rounded cursor-pointer hover:opacity-80"
                            style={{
                                backgroundColor: currentTheme.styles.surfaceAccent,
                                color: currentTheme.styles.contentPrimary,
                            }}
                            onClick={handleCreateNew}
                        >
                            Create tag "#{pluginState.query}"
                        </div>
                    )}
                    {!pluginState.query && (
                        <div
                            className="p-2 text-sm"
                            style={{ color: currentTheme.styles.contentSecondary }}
                        >
                            Type to search or create a tag...
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-1">
                    {filteredTags.map((tag, index) => {
                        const isSelected = index === selectedIndex;

                        return (
                            <div
                                key={tag.tag}
                                ref={isSelected ? selectedRef : undefined}
                                className="px-3 py-2 cursor-pointer flex items-center justify-between"
                                style={{
                                    backgroundColor: isSelected
                                        ? currentTheme.styles.surfaceAccent
                                        : "transparent",
                                    color: currentTheme.styles.contentPrimary,
                                }}
                                onClick={() => handleSelect(tag)}
                                onMouseEnter={() => {
                                    // Update selected index on hover
                                    view.dispatch(
                                        view.state.tr.setMeta(tagLinkPluginKey, {
                                            setSelectedIndex: index,
                                        })
                                    );
                                }}
                            >
                                <span className="font-medium">#{tag.tag}</span>
                                <span
                                    className="text-xs ml-2"
                                    style={{ color: currentTheme.styles.contentTertiary }}
                                >
                                    {tag.count} {tag.count === 1 ? "note" : "notes"}
                                </span>
                            </div>
                        );
                    })}

                    {/* Option to create new tag if query doesn't match exactly */}
                    {pluginState.query &&
                        !filteredTags.some(
                            (t) => t.tag.toLowerCase() === pluginState.query.toLowerCase()
                        ) && (
                            <div
                                className="px-3 py-2 cursor-pointer border-t"
                                style={{
                                    borderColor: currentTheme.styles.borderDefault,
                                    color: currentTheme.styles.contentSecondary,
                                }}
                                onClick={handleCreateNew}
                            >
                                Create "#{pluginState.query}"
                            </div>
                        )}
                </div>
            )}

            {/* Footer hints */}
            <div
                className="px-3 py-2 text-xs border-t flex gap-4"
                style={{
                    borderColor: currentTheme.styles.borderDefault,
                    color: currentTheme.styles.contentTertiary,
                }}
            >
                <span>
                    <kbd className="px-1 rounded bg-opacity-20">↑↓</kbd> navigate
                </span>
                <span>
                    <kbd className="px-1 rounded bg-opacity-20">Enter</kbd> select
                </span>
                <span>
                    <kbd className="px-1 rounded bg-opacity-20">Esc</kbd> close
                </span>
            </div>
        </div>
    );

    // Render in a portal to escape any overflow:hidden containers
    return createPortal(popupContent, document.body);
}
