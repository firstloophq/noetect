import React, { useEffect, useState, useCallback, useRef } from "react";
import { EditorView } from "prosemirror-view";
import { createPortal } from "react-dom";
import {
    WikiLinkPluginState,
    wikiLinkPluginKey,
    insertWikiLink,
    getWikiLinkPopupPosition,
} from "./plugin";
import { notesAPI } from "@/hooks/useNotesAPI";
import { Note } from "@/features/notes";
import { useTheme } from "@/hooks/useTheme";

interface WikiLinkPopupProps {
    view: EditorView;
    pluginState: WikiLinkPluginState;
}

/**
 * Simple fuzzy match scoring
 */
function fuzzyMatch(query: string, text: string): number {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();

    // Exact match gets highest score
    if (textLower === queryLower) return 1000;

    // Starts with query
    if (textLower.startsWith(queryLower)) return 500 + (100 - text.length);

    // Contains query
    if (textLower.includes(queryLower)) return 200 + (100 - text.length);

    // Fuzzy character match
    let score = 0;
    let queryIndex = 0;

    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
        if (textLower[i] === queryLower[queryIndex]) {
            score += 10;
            queryIndex++;
        }
    }

    // Only count as match if all query characters were found
    if (queryIndex === queryLower.length) {
        return score;
    }

    return 0;
}

/**
 * Filter and sort notes by fuzzy match
 */
function filterNotes(notes: Note[], query: string): Note[] {
    if (!query) {
        // Return recent notes sorted by modified date
        return [...notes]
            .sort((a, b) => {
                const aTime = a.frontMatter?.modified || a.frontMatter?.created || 0;
                const bTime = b.frontMatter?.modified || b.frontMatter?.created || 0;
                return Number(bTime) - Number(aTime);
            })
            .slice(0, 10);
    }

    return notes
        .map((note) => ({
            note,
            score: fuzzyMatch(query, note.fileName.replace(/\.md$/, "")),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((item) => item.note);
}

export function WikiLinkPopup({ view, pluginState }: WikiLinkPopupProps) {
    const { currentTheme } = useTheme();
    const [notes, setNotes] = useState<Note[]>([]);
    const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const popupRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<HTMLDivElement>(null);

    // Load notes on mount
    useEffect(() => {
        let mounted = true;

        async function loadNotes() {
            try {
                const allNotes = await notesAPI.getNotes();
                if (mounted) {
                    setNotes(allNotes);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Failed to load notes:", error);
                if (mounted) setLoading(false);
            }
        }

        loadNotes();
        return () => {
            mounted = false;
        };
    }, []);

    // Filter notes when query changes
    useEffect(() => {
        const filtered = filterNotes(notes, pluginState.query);
        setFilteredNotes(filtered);
    }, [notes, pluginState.query]);

    // Scroll selected item into view
    useEffect(() => {
        selectedRef.current?.scrollIntoView({ block: "nearest" });
    }, [pluginState.selectedIndex]);

    // Handle selection
    const handleSelect = useCallback(
        (note: Note) => {
            const noteName = note.fileName.replace(/\.md$/, "");
            insertWikiLink(view, noteName);
        },
        [view]
    );

    // Handle creating new note
    const handleCreateNew = useCallback(() => {
        if (pluginState.query) {
            insertWikiLink(view, pluginState.query);
        }
    }, [view, pluginState.query]);

    // Use a ref to always have latest state for the event handler
    const pluginStateRef = useRef(pluginState);
    pluginStateRef.current = pluginState;

    const filteredNotesRef = useRef(filteredNotes);
    filteredNotesRef.current = filteredNotes;

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
            const currentNotes = filteredNotesRef.current;

            // Only handle when popup is actually active
            if (!currentState.active) return;

            if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();
                event.stopPropagation();

                // Mark as handled immediately to prevent race conditions
                handledRef.current = true;

                const selectedIndex = Math.min(
                    currentState.selectedIndex,
                    Math.max(0, currentNotes.length - 1)
                );

                if (currentNotes[selectedIndex]) {
                    handleSelect(currentNotes[selectedIndex]);
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
    const position = getWikiLinkPopupPosition(view);
    if (!position || !pluginState.active) return null;

    // Clamp selected index
    const selectedIndex = Math.min(
        pluginState.selectedIndex,
        Math.max(0, filteredNotes.length - 1)
    );

    // Determine if popup should flip above the cursor
    // Flip when cursor is in the bottom 40% of the viewport
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
    const flipThreshold = viewportHeight * 0.6;
    const shouldFlipAbove = position.bottom > flipThreshold;

    const popupContent = (
        <div
            ref={popupRef}
            className="fixed z-50 min-w-[300px] max-w-[400px] max-h-[300px] overflow-y-auto rounded-lg shadow-lg border"
            style={{
                // When flipping above, anchor to top of cursor and translate up by 100% of popup height
                // This avoids needing to measure the popup height in JS
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
                    Loading notes...
                </div>
            ) : filteredNotes.length === 0 ? (
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
                            Create "{pluginState.query}"
                        </div>
                    )}
                    {!pluginState.query && (
                        <div
                            className="p-2 text-sm"
                            style={{ color: currentTheme.styles.contentSecondary }}
                        >
                            Type to search notes...
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-1">
                    {filteredNotes.map((note, index) => {
                        const isSelected = index === selectedIndex;
                        const noteName = note.fileName.replace(/\.md$/, "");

                        return (
                            <div
                                key={note.fileName}
                                ref={isSelected ? selectedRef : undefined}
                                className="px-3 py-2 cursor-pointer"
                                style={{
                                    backgroundColor: isSelected
                                        ? currentTheme.styles.surfaceAccent
                                        : "transparent",
                                    color: currentTheme.styles.contentPrimary,
                                }}
                                onClick={() => handleSelect(note)}
                                onMouseEnter={() => {
                                    // Update selected index on hover
                                    view.dispatch(
                                        view.state.tr.setMeta(wikiLinkPluginKey, {
                                            setSelectedIndex: index,
                                        })
                                    );
                                }}
                            >
                                <div className="font-medium">{noteName}</div>
                                {Array.isArray(note.frontMatter?.tags) && note.frontMatter.tags.length > 0 && (
                                    <div
                                        className="text-xs mt-0.5"
                                        style={{ color: currentTheme.styles.contentTertiary }}
                                    >
                                        {(note.frontMatter.tags as string[]).slice(0, 3).join(", ")}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Option to create new note if query doesn't match exactly */}
                    {pluginState.query &&
                        !filteredNotes.some(
                            (n) =>
                                n.fileName.replace(/\.md$/, "").toLowerCase() ===
                                pluginState.query.toLowerCase()
                        ) && (
                            <div
                                className="px-3 py-2 cursor-pointer border-t"
                                style={{
                                    borderColor: currentTheme.styles.borderDefault,
                                    color: currentTheme.styles.contentSecondary,
                                }}
                                onClick={handleCreateNew}
                            >
                                Create "{pluginState.query}"
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
