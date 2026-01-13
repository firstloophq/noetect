import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/hooks/useTheme";
import { notesAPI } from "@/hooks/useNotesAPI";

interface TagInputProps {
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    placeholder?: string;
}

export function TagInput({ tags, onTagsChange, placeholder = "Type a tag..." }: TagInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [allTags, setAllTags] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const { currentTheme } = useTheme();

    // Load all existing tags from notes
    useEffect(() => {
        async function loadTags() {
            try {
                const notes = await notesAPI.getNotes();
                const tagSet = new Set<string>();
                notes.forEach((note) => {
                    const noteTags = note.frontMatter?.tags;
                    if (Array.isArray(noteTags)) {
                        noteTags.forEach((tag) => {
                            if (typeof tag === "string") {
                                tagSet.add(tag);
                            }
                        });
                    }
                });
                setAllTags(Array.from(tagSet).sort());
            } catch (error) {
                console.error("Failed to load tags:", error);
            }
        }
        if (isOpen) {
            loadTags();
        }
    }, [isOpen]);

    // Filter suggestions based on input (tags that start with the input)
    const suggestions = inputValue.trim()
        ? allTags.filter(
              (tag) =>
                  tag.toLowerCase().startsWith(inputValue.toLowerCase()) &&
                  !tags.includes(tag)
          )
        : [];

    const addTag = (tagToAdd?: string) => {
        const trimmedValue = (tagToAdd || inputValue).trim();
        if (trimmedValue && !tags.includes(trimmedValue)) {
            onTagsChange([...tags, trimmedValue]);
            setInputValue("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        onTagsChange(tags.filter((tag) => tag !== tagToRemove));
    };

    // Get top 5 suggestions to display
    const displayedSuggestions = suggestions.slice(0, 5);

    // Get the autocomplete suggestion (first match)
    const autocompleteSuggestion = inputValue && displayedSuggestions.length > 0
        ? displayedSuggestions[0]
        : null;

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Tab" && autocompleteSuggestion) {
            // Tab to autocomplete with first suggestion
            e.preventDefault();
            setInputValue(autocompleteSuggestion);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (e.metaKey || e.ctrlKey) {
                // Cmd+Enter to close dialog
                setIsOpen(false);
                setInputValue("");
            } else {
                // Enter to add the tag as typed
                addTag();
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
            setInputValue("");
        } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
            // Remove last tag when backspace on empty input
            removeTag(tags[tags.length - 1]);
        }
    };

    // Focus input when dialog opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isOpen]);

    return (
        <>
            <div className="flex items-center gap-2 flex-wrap">
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="group/tag flex items-center gap-0.5 text-xs"
                        style={{
                            color: currentTheme.styles.contentSecondary,
                        }}
                    >
                        {tag}
                        <button
                            onClick={() => removeTag(tag)}
                            className="opacity-0 group-hover/tag:opacity-100 transition-opacity"
                            style={{
                                color: currentTheme.styles.contentTertiary,
                            }}
                            aria-label={`Remove ${tag} tag`}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ))}

                <button
                    className="text-[10px] uppercase tracking-wider opacity-40 hover:opacity-70 transition-opacity flex items-center gap-1"
                    onClick={() => setIsOpen(true)}
                    style={{
                        color: currentTheme.styles.contentTertiary,
                    }}
                >
                    <Plus className="h-2.5 w-2.5" />
                    Add tag
                </button>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent
                    className="sm:max-w-md"
                    style={{
                        backgroundColor: currentTheme.styles.surfacePrimary,
                        borderColor: currentTheme.styles.borderDefault,
                    }}
                >
                    <DialogHeader>
                        <DialogTitle style={{ color: currentTheme.styles.contentPrimary }}>
                            Manage Tags
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Current tags */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-3">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="group/tag flex items-center gap-1 text-sm"
                                        style={{
                                            color: currentTheme.styles.contentPrimary,
                                        }}
                                    >
                                        {tag}
                                        <button
                                            onClick={() => removeTag(tag)}
                                            className="opacity-40 hover:opacity-100 transition-opacity"
                                            style={{ color: currentTheme.styles.contentSecondary }}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Input with ghost text autocomplete */}
                        <div
                            className="relative rounded-md"
                            style={{
                                backgroundColor: currentTheme.styles.surfaceSecondary,
                                border: `1px solid ${currentTheme.styles.borderDefault}`,
                            }}
                        >
                            {/* Ghost text layer - shows autocomplete suggestion */}
                            <div
                                className="absolute inset-0 px-3 py-2 text-sm pointer-events-none flex items-center overflow-hidden"
                            >
                                <span style={{ color: currentTheme.styles.contentPrimary }}>{inputValue}</span>
                                {autocompleteSuggestion && (
                                    <span style={{ color: currentTheme.styles.contentTertiary, opacity: 0.6 }}>
                                        {autocompleteSuggestion.slice(inputValue.length)}
                                    </span>
                                )}
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={placeholder}
                                className="w-full px-3 py-2 rounded-md text-sm outline-none relative"
                                style={{
                                    backgroundColor: 'transparent',
                                    color: 'transparent',
                                    caretColor: currentTheme.styles.contentPrimary,
                                }}
                            />
                        </div>

                        {/* Suggestions list */}
                        {displayedSuggestions.length > 0 && inputValue && (
                            <div className="flex flex-wrap items-center gap-x-1 text-xs" style={{ color: currentTheme.styles.contentTertiary }}>
                                {displayedSuggestions.map((tag, index) => (
                                    <span key={tag} className="flex items-center">
                                        <button
                                            onClick={() => addTag(tag)}
                                            className="hover:underline transition-all"
                                            style={{
                                                color: currentTheme.styles.contentAccent,
                                            }}
                                        >
                                            {tag}
                                        </button>
                                        {index < displayedSuggestions.length - 1 && (
                                            <span className="mx-2">·</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Keyboard hints */}
                        <div
                            className="text-xs flex flex-wrap gap-x-4 gap-y-1 pt-2"
                            style={{ color: currentTheme.styles.contentTertiary }}
                        >
                            <span>
                                <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: currentTheme.styles.surfaceSecondary }}>Tab</kbd> autocomplete
                            </span>
                            <span>
                                <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: currentTheme.styles.surfaceSecondary }}>Enter</kbd> add tag
                            </span>
                            <span>
                                <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: currentTheme.styles.surfaceSecondary }}>⌘ Enter</kbd> done
                            </span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
