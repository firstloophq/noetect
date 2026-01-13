import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useTheme } from "@/hooks/useTheme";
import {
    Folder,
    FolderOpen,
    ChevronRight,
    Home,
    ArrowUp,
    RefreshCw,
    AlertCircle,
    Search,
    FolderPlus,
    X,
} from "lucide-react";

interface DirectoryEntry {
    name: string;
    path: string;
    isDirectory: boolean;
}

interface FolderPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (path: string) => void;
    title?: string;
    description?: string;
}

export function FolderPickerDialog({
    open,
    onOpenChange,
    onSelect,
    title = "Choose a Folder",
    description = "Select a folder to use as your workspace",
}: FolderPickerDialogProps) {
    const { currentTheme } = useTheme();
    const { styles } = currentTheme;

    const [currentPath, setCurrentPath] = useState<string>("");
    const [entries, setEntries] = useState<DirectoryEntry[]>([]);
    const [quickAccess, setQuickAccess] = useState<DirectoryEntry[]>([]);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualPath, setManualPath] = useState("");
    const [parentPath, setParentPath] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [createError, setCreateError] = useState<string | null>(null);

    // Simple fuzzy match function
    const fuzzyMatch = (text: string, query: string): boolean => {
        if (!query) return true;
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();

        // Check if all characters in query appear in order in text
        let queryIndex = 0;
        for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
            if (lowerText[i] === lowerQuery[queryIndex]) {
                queryIndex++;
            }
        }
        return queryIndex === lowerQuery.length;
    };

    // Filter entries based on search query
    const filteredEntries = entries.filter(entry => fuzzyMatch(entry.name, searchQuery));

    const loadDirectory = useCallback(async (path: string) => {
        setLoading(true);
        setError(null);
        setSelectedPath(null);
        setSearchQuery("");

        try {
            const response = await fetch("/api/filesystem/list", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to load directory");
            }

            setCurrentPath(data.path);
            setEntries(data.entries);
            setParentPath(data.parent);
            setManualPath(data.path);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, []);

    const loadQuickAccess = useCallback(async () => {
        try {
            const response = await fetch("/api/filesystem/quick-access");
            const data = await response.json();
            setQuickAccess(data.paths || []);
        } catch {
            // Silently fail for quick access
        }
    }, []);

    useEffect(() => {
        if (open) {
            // Load home directory and quick access on open
            // Use "~" which the backend will resolve to the actual home path
            loadDirectory("~");
            loadQuickAccess();
        }
    }, [open, loadDirectory, loadQuickAccess]);

    const handleEntryClick = (entry: DirectoryEntry) => {
        if (entry.isDirectory) {
            setSelectedPath(entry.path);
        }
    };

    const handleEntryDoubleClick = (entry: DirectoryEntry) => {
        if (entry.isDirectory) {
            loadDirectory(entry.path);
        }
    };

    const handleGoUp = () => {
        if (parentPath) {
            loadDirectory(parentPath);
        }
    };

    const handleGoHome = () => {
        loadDirectory("~");
    };

    const handleRefresh = () => {
        if (currentPath) {
            loadDirectory(currentPath);
        }
    };

    const handleManualPathSubmit = async () => {
        if (!manualPath.trim()) return;

        const response = await fetch("/api/filesystem/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: manualPath }),
        });

        const data = await response.json();

        if (data.valid) {
            loadDirectory(data.path);
        } else {
            setError(data.error || "Invalid path");
        }
    };

    const handleSelect = () => {
        const pathToSelect = selectedPath || currentPath;
        if (pathToSelect) {
            onSelect(pathToSelect);
            onOpenChange(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !currentPath) return;

        setCreateError(null);

        try {
            const response = await fetch("/api/filesystem/create-folder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    parentPath: currentPath,
                    folderName: newFolderName.trim(),
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Use the new folder as the workspace immediately
                onSelect(data.path);
                onOpenChange(false);
            } else {
                setCreateError(data.error || "Failed to create folder");
            }
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Failed to create folder");
        }
    };

    const handleCancelCreate = () => {
        setIsCreatingFolder(false);
        setNewFolderName("");
        setCreateError(null);
    };

    // Parse path into breadcrumb parts
    const pathParts = currentPath.split("/").filter(Boolean);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent size="lg" className="flex flex-col" style={{ height: "70vh", maxHeight: "600px" }}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="flex flex-1 gap-4 min-h-0">
                    {/* Quick Access Sidebar */}
                    <div
                        className="w-40 shrink-0 flex flex-col gap-1 py-2 overflow-y-auto"
                        style={{
                            borderRight: `1px solid ${styles.borderDefault}`,
                        }}
                    >
                        <div
                            className="px-2 py-1 text-xs font-medium uppercase tracking-wide"
                            style={{ color: styles.contentTertiary }}
                        >
                            Quick Access
                        </div>
                        {quickAccess.map((entry) => (
                            <button
                                key={entry.path}
                                onClick={() => loadDirectory(entry.path)}
                                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors text-left"
                                style={{
                                    color: styles.contentPrimary,
                                    backgroundColor:
                                        currentPath === entry.path
                                            ? styles.surfaceAccent
                                            : "transparent",
                                }}
                                onMouseEnter={(e) => {
                                    if (currentPath !== entry.path) {
                                        e.currentTarget.style.backgroundColor =
                                            styles.surfaceSecondary;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (currentPath !== entry.path) {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                    }
                                }}
                            >
                                <Folder className="size-4 shrink-0" />
                                <span className="truncate">{entry.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Toolbar */}
                        <div className="flex items-center gap-2 pb-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleGoUp}
                                disabled={!parentPath}
                                title="Go up"
                            >
                                <ArrowUp className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleGoHome}
                                title="Go home"
                            >
                                <Home className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleRefresh}
                                title="Refresh"
                            >
                                <RefreshCw className="size-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCreatingFolder(true)}
                                disabled={!currentPath}
                            >
                                <FolderPlus className="size-4" />
                                New Folder
                            </Button>

                            {/* Path Input */}
                            <form
                                className="flex-1"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleManualPathSubmit();
                                }}
                            >
                                <Input
                                    value={manualPath}
                                    onChange={(e) => setManualPath(e.target.value)}
                                    onBlur={() => handleManualPathSubmit()}
                                    placeholder="Enter path..."
                                    className="w-full text-sm h-8"
                                />
                            </form>
                        </div>

                        {/* Breadcrumb */}
                        <div
                            className="flex items-center gap-1 pb-2 text-sm overflow-x-auto"
                            style={{ color: styles.contentSecondary }}
                        >
                            <button
                                onClick={() => loadDirectory("/")}
                                className="hover:underline px-1"
                            >
                                /
                            </button>
                            {pathParts.map((part, index) => {
                                const partPath = "/" + pathParts.slice(0, index + 1).join("/");
                                return (
                                    <span key={partPath} className="flex items-center">
                                        <ChevronRight className="size-3" />
                                        <button
                                            onClick={() => loadDirectory(partPath)}
                                            className="hover:underline px-1"
                                        >
                                            {part}
                                        </button>
                                    </span>
                                );
                            })}
                        </div>

                        {/* Search Input */}
                        <div className="relative pb-2">
                            <Search
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4"
                                style={{ color: styles.contentTertiary }}
                            />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search folders..."
                                className="pl-8 text-sm h-8"
                            />
                        </div>

                        {/* Create Folder Input */}
                        {isCreatingFolder && (
                            <div
                                className="flex flex-col gap-2 p-3 rounded mb-2"
                                style={{
                                    backgroundColor: styles.surfaceAccent,
                                    border: `1px solid ${styles.borderDefault}`,
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <FolderPlus
                                        className="size-4 shrink-0"
                                        style={{ color: styles.contentSecondary }}
                                    />
                                    <span
                                        className="text-sm font-medium"
                                        style={{ color: styles.contentPrimary }}
                                    >
                                        Create New Folder
                                    </span>
                                </div>
                                <form
                                    className="flex gap-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleCreateFolder();
                                    }}
                                >
                                    <Input
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="Folder name..."
                                        className="flex-1 text-sm h-8"
                                        autoFocus
                                    />
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={!newFolderName.trim()}
                                    >
                                        Create
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelCreate}
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </form>
                                {createError && (
                                    <div
                                        className="flex items-center gap-2 text-sm"
                                        style={{ color: styles.semanticDestructive }}
                                    >
                                        <AlertCircle className="size-3" />
                                        {createError}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div
                                className="flex items-center gap-2 p-2 rounded text-sm mb-2"
                                style={{
                                    backgroundColor: styles.semanticDestructive + "20",
                                    color: styles.semanticDestructive,
                                }}
                            >
                                <AlertCircle className="size-4" />
                                {error}
                            </div>
                        )}

                        {/* Directory Listing */}
                        <div
                            className="flex-1 border rounded overflow-y-auto"
                            style={{
                                borderColor: styles.borderDefault,
                                backgroundColor: styles.surfacePrimary,
                            }}
                        >
                            {loading ? (
                                <div
                                    className="flex items-center justify-center h-full"
                                    style={{ color: styles.contentSecondary }}
                                >
                                    Loading...
                                </div>
                            ) : filteredEntries.length === 0 ? (
                                <div
                                    className="flex items-center justify-center h-full"
                                    style={{ color: styles.contentSecondary }}
                                >
                                    {searchQuery ? "No matching folders" : "No folders found"}
                                </div>
                            ) : (
                                <div className="p-1">
                                    {filteredEntries.map((entry) => (
                                        <button
                                            key={entry.path}
                                            onClick={() => handleEntryClick(entry)}
                                            onDoubleClick={() => handleEntryDoubleClick(entry)}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors text-left"
                                            style={{
                                                color: styles.contentPrimary,
                                                backgroundColor:
                                                    selectedPath === entry.path
                                                        ? styles.surfaceAccent
                                                        : "transparent",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedPath !== entry.path) {
                                                    e.currentTarget.style.backgroundColor =
                                                        styles.surfaceSecondary;
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedPath !== entry.path) {
                                                    e.currentTarget.style.backgroundColor =
                                                        "transparent";
                                                }
                                            }}
                                        >
                                            {selectedPath === entry.path ? (
                                                <FolderOpen className="size-4 shrink-0" />
                                            ) : (
                                                <Folder className="size-4 shrink-0" />
                                            )}
                                            <span className="truncate">{entry.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Path Display */}
                        <div
                            className="pt-2 text-sm"
                            style={{ color: styles.contentSecondary }}
                        >
                            Selected:{" "}
                            <span style={{ color: styles.contentPrimary }}>
                                {selectedPath || currentPath || "None"}
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-4">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSelect} disabled={!selectedPath && !currentPath}>
                        Select Folder
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
