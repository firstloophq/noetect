import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { X, FolderKanban } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/hooks/useTheme";
import { todosAPI } from "@/hooks/useTodosAPI";

interface ProjectInputProps {
    project: string | null;
    onProjectChange: (project: string | null) => void;
}

export function ProjectInput({ project, onProjectChange }: ProjectInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [allProjects, setAllProjects] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const { currentTheme } = useTheme();

    // Load all existing projects from todos
    useEffect(() => {
        async function loadProjects() {
            try {
                const projects = await todosAPI.getProjects();
                setAllProjects(projects.sort());
            } catch (error) {
                console.error("Failed to load projects:", error);
            }
        }
        if (isOpen) {
            loadProjects();
        }
    }, [isOpen]);

    // Filter suggestions based on input (projects that contain the input)
    const suggestions = inputValue.trim()
        ? allProjects.filter(
              (p) =>
                  p.toLowerCase().includes(inputValue.toLowerCase()) &&
                  p !== project
          )
        : allProjects.filter((p) => p !== project);

    const selectProject = (projectToSelect?: string) => {
        const trimmedValue = (projectToSelect || inputValue).trim();
        if (trimmedValue) {
            onProjectChange(trimmedValue);
            setInputValue("");
            setIsOpen(false);
        }
    };

    const removeProject = () => {
        onProjectChange(null);
    };

    // Get top 8 suggestions to display
    const displayedSuggestions = suggestions.slice(0, 8);

    // Get the autocomplete suggestion (first match when typing)
    const autocompleteSuggestion = inputValue && displayedSuggestions.length > 0
        ? displayedSuggestions.find(p => p.toLowerCase().startsWith(inputValue.toLowerCase()))
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
                // Enter to select the project as typed
                selectProject();
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
            setInputValue("");
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
            <div className="flex items-center gap-2">
                {project ? (
                    <span
                        className="group/project flex items-center gap-1 text-xs"
                        style={{
                            color: currentTheme.styles.contentSecondary,
                        }}
                    >
                        <FolderKanban className="h-3 w-3" style={{ color: currentTheme.styles.contentAccent }} />
                        <button
                            onClick={() => setIsOpen(true)}
                            className="hover:underline"
                        >
                            {project}
                        </button>
                        <button
                            onClick={removeProject}
                            className="opacity-0 group-hover/project:opacity-100 transition-opacity"
                            style={{
                                color: currentTheme.styles.contentTertiary,
                            }}
                            aria-label="Remove project"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ) : (
                    <button
                        className="text-[10px] uppercase tracking-wider opacity-40 hover:opacity-70 transition-opacity flex items-center gap-1"
                        onClick={() => setIsOpen(true)}
                        style={{
                            color: currentTheme.styles.contentTertiary,
                        }}
                    >
                        <FolderKanban className="h-2.5 w-2.5" />
                        Add to project
                    </button>
                )}
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
                            {project ? "Change Project" : "Add to Project"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Current project */}
                        {project && (
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-sm"
                                    style={{ color: currentTheme.styles.contentSecondary }}
                                >
                                    Current:
                                </span>
                                <span
                                    className="flex items-center gap-1 text-sm"
                                    style={{ color: currentTheme.styles.contentPrimary }}
                                >
                                    <FolderKanban className="h-3.5 w-3.5" style={{ color: currentTheme.styles.contentAccent }} />
                                    {project}
                                </span>
                                <button
                                    onClick={removeProject}
                                    className="text-xs hover:underline"
                                    style={{ color: currentTheme.styles.semanticDestructive }}
                                >
                                    Remove
                                </button>
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
                                placeholder="Type a project name..."
                                className="w-full px-3 py-2 rounded-md text-sm outline-none relative"
                                style={{
                                    backgroundColor: 'transparent',
                                    color: 'transparent',
                                    caretColor: currentTheme.styles.contentPrimary,
                                }}
                            />
                        </div>

                        {/* Existing projects list */}
                        {displayedSuggestions.length > 0 && (
                            <div className="space-y-1">
                                <div
                                    className="text-xs"
                                    style={{ color: currentTheme.styles.contentTertiary }}
                                >
                                    {inputValue ? "Matching projects:" : "Existing projects:"}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {displayedSuggestions.map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => selectProject(p)}
                                            className="flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors hover:bg-accent/50"
                                            style={{
                                                backgroundColor: currentTheme.styles.surfaceSecondary,
                                                color: currentTheme.styles.contentPrimary,
                                            }}
                                        >
                                            <FolderKanban className="h-3 w-3" style={{ color: currentTheme.styles.contentAccent }} />
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Create new project hint */}
                        {inputValue && !allProjects.includes(inputValue) && (
                            <div
                                className="text-xs"
                                style={{ color: currentTheme.styles.contentTertiary }}
                            >
                                Press Enter to create "{inputValue}" as a new project
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
                                <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: currentTheme.styles.surfaceSecondary }}>Enter</kbd> select
                            </span>
                            <span>
                                <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: currentTheme.styles.surfaceSecondary }}>Esc</kbd> cancel
                            </span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
