import { useEffect, useState, useRef, useCallback } from "react";
import { usePlugin } from "@/hooks/usePlugin";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Hash, FileText, CheckSquare } from "lucide-react";
import { useNotesAPI } from "@/hooks/useNotesAPI";
import { useTodosAPI } from "@/hooks/useTodosAPI";
import { useTheme } from "@/hooks/useTheme";
import { notesPluginSerial } from "@/features/notes";
import { todosPluginSerial } from "@/features/todos";
import { cn } from "@/lib/utils";
import type { TagDetailViewProps } from "./index";

interface FileReference {
    fileRef: string;
    source: "notes" | "todos";
    path: string;
    displayName: string;
    title?: string; // Fetched title for display
}

function parseFileRef(fileRef: string): FileReference {
    if (fileRef.startsWith("notes:")) {
        const path = fileRef.slice(6);
        return {
            fileRef,
            source: "notes",
            path,
            displayName: path.replace(/\.md$/, ""),
        };
    } else if (fileRef.startsWith("todos:")) {
        const path = fileRef.slice(6);
        return {
            fileRef,
            source: "todos",
            path,
            displayName: path.replace(/\.md$/, ""),
        };
    }
    // Default to notes for backwards compatibility
    return {
        fileRef,
        source: "notes",
        path: fileRef,
        displayName: fileRef.replace(/\.md$/, ""),
    };
}

export function TagDetailView({ tabId, tagName }: { tabId: string } & TagDetailViewProps) {
    if (!tabId) {
        throw new Error("tabId is required");
    }
    const { activeTab, setTabName, addNewTab, setActiveTabId, getViewSelfPlacement, setSidebarTabId } = useWorkspaceContext();
    const { loading, error, setLoading, setError } = usePlugin();
    const [files, setFiles] = useState<FileReference[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { currentTheme } = useTheme();
    const placement = getViewSelfPlacement(tabId);

    const hasSetTabNameRef = useRef<boolean>(false);
    const listRef = useRef<HTMLDivElement>(null);

    const notesAPI = useNotesAPI();
    const todosAPI = useTodosAPI();

    // Set tab name
    useEffect(() => {
        if (activeTab?.id === tabId && !hasSetTabNameRef.current) {
            setTabName(tabId, `#${tagName}`);
            hasSetTabNameRef.current = true;
        }
    }, [activeTab?.id, tabId, tagName, setTabName]);

    // Load files with this tag
    useEffect(() => {
        const fetchFiles = async () => {
            try {
                setLoading(true);
                setError(null);
                const result = await notesAPI.getFilesWithTag({ tag: tagName });
                const parsed = result.map(parseFileRef);

                // Fetch todo titles for todo files
                const filesWithTitles = await Promise.all(
                    parsed.map(async (file) => {
                        if (file.source === "todos") {
                            try {
                                // Extract todo ID from path (remove .md extension)
                                const todoId = file.path.replace(/\.md$/, "");
                                const todo = await todosAPI.getTodoById({ todoId });
                                return { ...file, title: todo.title };
                            } catch {
                                // If fetch fails, keep the displayName
                                return file;
                            }
                        }
                        return file;
                    })
                );

                setFiles(filesWithTitles);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Failed to fetch files";
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };
        fetchFiles();
    }, [tagName, notesAPI, todosAPI, setLoading, setError]);

    // Open file
    const handleOpenFile = useCallback(
        async (file: FileReference) => {
            if (file.source === "notes") {
                const newTab = await addNewTab({
                    pluginMeta: notesPluginSerial,
                    view: "editor",
                    props: { noteFileName: file.path },
                });
                if (newTab) {
                    if (placement === "sidebar") {
                        setSidebarTabId(newTab.id);
                    } else {
                        setActiveTabId(newTab.id);
                    }
                }
            } else if (file.source === "todos") {
                // Extract todo ID from path (remove .md extension)
                const todoId = file.path.replace(/\.md$/, "");
                const newTab = await addNewTab({
                    pluginMeta: todosPluginSerial,
                    view: "detail",
                    props: { todoId },
                });
                if (newTab) {
                    if (placement === "sidebar") {
                        setSidebarTabId(newTab.id);
                    } else {
                        setActiveTabId(newTab.id);
                    }
                }
            }
        },
        [addNewTab, placement, setActiveTabId, setSidebarTabId]
    );

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (files.length === 0) return;

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.min(prev + 1, files.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case "Enter":
                    e.preventDefault();
                    {
                        const selectedFile = files[selectedIndex];
                        if (selectedFile) {
                            handleOpenFile(selectedFile);
                        }
                    }
                    break;
            }
        },
        [files, selectedIndex, handleOpenFile]
    );

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedItem = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            selectedItem?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }, [selectedIndex]);

    // Group files by source
    const noteFiles = files.filter((f) => f.source === "notes");
    const todoFiles = files.filter((f) => f.source === "todos");

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <Alert variant="destructive">
                    <AlertDescription>Error: {error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div
            className="h-full flex flex-col"
            style={{ backgroundColor: currentTheme.styles.surfacePrimary }}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            {/* Header */}
            <div
                className="sticky top-0 z-10 px-4 py-3 border-b"
                style={{
                    backgroundColor: currentTheme.styles.surfacePrimary,
                    borderColor: currentTheme.styles.borderDefault,
                }}
            >
                <div className="flex items-center gap-3">
                    <Hash
                        size={24}
                        style={{ color: currentTheme.styles.contentAccent }}
                    />
                    <h1
                        className="text-2xl font-semibold"
                        style={{ color: currentTheme.styles.contentPrimary }}
                    >
                        {tagName}
                    </h1>
                    <span
                        className="text-sm px-2 py-0.5 rounded-full"
                        style={{
                            backgroundColor: currentTheme.styles.surfaceTertiary,
                            color: currentTheme.styles.contentSecondary
                        }}
                    >
                        {files.length} {files.length === 1 ? "file" : "files"}
                    </span>
                </div>
            </div>

            {/* Files list */}
            <div
                ref={listRef}
                className="flex-1 overflow-y-auto p-4 space-y-6"
            >
                {files.length === 0 ? (
                    <div
                        className="text-center py-8"
                        style={{ color: currentTheme.styles.contentTertiary }}
                    >
                        No files use this tag
                    </div>
                ) : (
                    <>
                        {/* Notes section */}
                        {noteFiles.length > 0 && (
                            <div>
                                <div
                                    className="flex items-center gap-2 mb-2 text-sm font-medium"
                                    style={{ color: currentTheme.styles.contentSecondary }}
                                >
                                    <FileText size={14} />
                                    <span>Notes ({noteFiles.length})</span>
                                </div>
                                <div className="space-y-1">
                                    {noteFiles.map((file, index) => {
                                        const globalIndex = index;
                                        return (
                                            <button
                                                key={file.fileRef}
                                                data-index={globalIndex}
                                                onClick={() => handleOpenFile(file)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left",
                                                    "hover:bg-accent/50 focus:outline-none"
                                                )}
                                                style={{
                                                    backgroundColor: globalIndex === selectedIndex
                                                        ? currentTheme.styles.surfaceAccent
                                                        : "transparent",
                                                    color: currentTheme.styles.contentPrimary,
                                                }}
                                            >
                                                <FileText
                                                    size={16}
                                                    style={{ color: currentTheme.styles.contentTertiary }}
                                                />
                                                <span>{file.displayName}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Todos section */}
                        {todoFiles.length > 0 && (
                            <div>
                                <div
                                    className="flex items-center gap-2 mb-2 text-sm font-medium"
                                    style={{ color: currentTheme.styles.contentSecondary }}
                                >
                                    <CheckSquare size={14} />
                                    <span>Todos ({todoFiles.length})</span>
                                </div>
                                <div className="space-y-1">
                                    {todoFiles.map((file, index) => {
                                        const globalIndex = noteFiles.length + index;
                                        return (
                                            <button
                                                key={file.fileRef}
                                                data-index={globalIndex}
                                                onClick={() => handleOpenFile(file)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left",
                                                    "hover:bg-accent/50 focus:outline-none"
                                                )}
                                                style={{
                                                    backgroundColor: globalIndex === selectedIndex
                                                        ? currentTheme.styles.surfaceAccent
                                                        : "transparent",
                                                    color: currentTheme.styles.contentPrimary,
                                                }}
                                            >
                                                <CheckSquare
                                                    size={16}
                                                    style={{ color: currentTheme.styles.contentTertiary }}
                                                />
                                                <span>{file.title || file.displayName}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default TagDetailView;
