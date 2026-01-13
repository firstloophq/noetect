import * as React from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { useCommandDialog } from "@/components/CommandDialogProvider";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useNotesAPI } from "@/hooks/useNotesAPI";
import { useNativeSubmit } from "@/hooks/useNativeKeyboardBridge";
import { KeyboardIndicator } from "@/components/KeyboardIndicator";
import { NoteFolder } from "./index";
import { FolderIcon, FolderRootIcon, CheckIcon } from "lucide-react";

interface MoveToFolderDialogProps {
    noteFileName: string;
    currentFolder: string | undefined;
    onSuccess?: () => void;
}

export function MoveToFolderDialog({ noteFileName, currentFolder, onSuccess }: MoveToFolderDialogProps) {
    const [folders, setFolders] = React.useState<NoteFolder[]>([]);
    const [selectedFolder, setSelectedFolder] = React.useState<string | null>(currentFolder ?? null);
    const [isMoving, setIsMoving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const { closeDialog } = useCommandDialog();
    const { renameNoteTabs } = useWorkspaceContext();
    const api = useNotesAPI();
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Fetch folders on mount
    React.useEffect(() => {
        const fetchFolders = async () => {
            try {
                const folderList = await api.getFolders();
                setFolders(folderList);
            } catch (err) {
                console.error("Failed to fetch folders:", err);
                setError("Failed to load folders");
            } finally {
                setIsLoading(false);
            }
        };
        fetchFolders();
    }, [api]);

    // Focus input on mount
    React.useEffect(() => {
        // Small delay to ensure the Command component is fully mounted
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
    }, []);

    const handleMove = React.useCallback(async () => {
        // Check if moving to the same folder
        if (selectedFolder === (currentFolder ?? null)) {
            closeDialog();
            return;
        }

        setIsMoving(true);
        setError(null);

        try {
            const result = await api.moveNoteToFolder({
                fileName: noteFileName,
                targetFolder: selectedFolder,
            });

            // Update all open tabs with this note to use the new filename
            if (result.fileName !== noteFileName) {
                renameNoteTabs(noteFileName, result.fileName);
            }

            closeDialog();
            onSuccess?.();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to move note";
            setError(message);
        } finally {
            setIsMoving(false);
        }
    }, [selectedFolder, currentFolder, noteFileName, api, renameNoteTabs, closeDialog, onSuccess]);

    // Handle Cmd+Enter for both web and MacOS
    useNativeSubmit(() => {
        if (!isMoving && !isLoading) {
            handleMove();
        }
    });

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // CMD+Enter or Ctrl+Enter to submit
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isMoving && !isLoading) {
            e.preventDefault();
            handleMove();
        }
    };

    const handleSelectFolder = (folderPath: string | null) => {
        setSelectedFolder(folderPath);
    };

    // Extract just the file name for display
    const displayFileName = noteFileName.includes("/")
        ? noteFileName.substring(noteFileName.lastIndexOf("/") + 1)
        : noteFileName;

    return (
        <>
            <DialogHeader>
                <DialogTitle>Move Note to Folder</DialogTitle>
                <DialogDescription>
                    Select a folder for "{displayFileName}"
                </DialogDescription>
            </DialogHeader>
            <div className="pt-2 pb-4" onKeyDown={handleKeyDown}>
                <Command>
                    <CommandInput
                        ref={inputRef}
                        placeholder="Search folders..."
                        disabled={isMoving}
                        className="mb-2"
                    />
                    <CommandList className="max-h-[200px]">
                        {isLoading ? (
                            <div className="py-4 text-center text-sm text-muted-foreground">
                                Loading folders...
                            </div>
                        ) : (
                            <>
                                <CommandEmpty>No folders found.</CommandEmpty>
                                <CommandGroup>
                                    {/* Root folder option */}
                                    <CommandItem
                                        value="__root__"
                                        onSelect={() => handleSelectFolder(null)}
                                        className="flex items-center gap-2"
                                    >
                                        <FolderRootIcon className="size-4" />
                                        <span className="flex-1">Root (No folder)</span>
                                        {selectedFolder === null && (
                                            <CheckIcon className="size-4 text-primary" />
                                        )}
                                    </CommandItem>
                                    {/* Folder options */}
                                    {folders.map((folder) => (
                                        <CommandItem
                                            key={folder.path}
                                            value={folder.path}
                                            onSelect={() => handleSelectFolder(folder.path)}
                                            className="flex items-center gap-2"
                                        >
                                            <FolderIcon className="size-4" />
                                            <span className="flex-1">{folder.path}</span>
                                            {selectedFolder === folder.path && (
                                                <CheckIcon className="size-4 text-primary" />
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
                {error && (
                    <p className="text-sm text-destructive mt-2">{error}</p>
                )}
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={closeDialog} disabled={isMoving} autoFocus>
                    Cancel
                </Button>
                <Button
                    onClick={handleMove}
                    disabled={isMoving || isLoading}
                    className="gap-2"
                >
                    {isMoving ? "Moving..." : "Move"}
                    {!isMoving && <KeyboardIndicator keys={["cmd", "↵"]} />}
                </Button>
            </DialogFooter>
        </>
    );
}
