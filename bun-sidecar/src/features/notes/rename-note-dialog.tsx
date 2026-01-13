import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCommandDialog } from "@/components/CommandDialogProvider";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useNotesAPI } from "@/hooks/useNotesAPI";
import { KeyboardIndicator } from "@/components/KeyboardIndicator";

interface RenameNoteDialogProps {
    noteFileName: string;
    onSuccess?: () => void;
}

export function RenameNoteDialog({ noteFileName, onSuccess }: RenameNoteDialogProps) {
    // Remove .md extension for display/editing
    const baseName = noteFileName.endsWith(".md") ? noteFileName.slice(0, -3) : noteFileName;
    const [newName, setNewName] = React.useState(baseName);
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const { closeDialog } = useCommandDialog();
    const { renameNoteTabs } = useWorkspaceContext();
    const api = useNotesAPI();
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Focus input on mount
    React.useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleRename = async () => {
        const trimmedName = newName.trim();

        if (!trimmedName) {
            setError("Name cannot be empty");
            return;
        }

        // Check if name is unchanged
        if (trimmedName === baseName) {
            closeDialog();
            return;
        }

        setIsRenaming(true);
        setError(null);

        try {
            const result = await api.renameNote({
                oldFileName: noteFileName,
                newFileName: trimmedName,
            });

            // Update all open tabs with this note to use the new filename
            renameNoteTabs(noteFileName, result.fileName);

            closeDialog();
            onSuccess?.();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to rename note";
            setError(message);
        } finally {
            setIsRenaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // CMD+Enter or Ctrl+Enter to submit
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isRenaming) {
            e.preventDefault();
            handleRename();
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>Rename Note</DialogTitle>
                <DialogDescription>
                    Enter a new name for "{noteFileName}"
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Input
                    ref={inputRef}
                    value={newName}
                    onChange={(e) => {
                        setNewName(e.target.value);
                        setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Note name"
                    disabled={isRenaming}
                />
                {error && (
                    <p className="text-sm text-destructive mt-2">{error}</p>
                )}
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={closeDialog} disabled={isRenaming}>
                    Cancel
                </Button>
                <Button
                    onClick={handleRename}
                    disabled={isRenaming || !newName.trim()}
                    className="gap-2"
                >
                    {isRenaming ? "Renaming..." : "Rename"}
                    {!isRenaming && <KeyboardIndicator keys={["cmd", "↵"]} />}
                </Button>
            </DialogFooter>
        </>
    );
}
