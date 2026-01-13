import * as React from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCommandDialog } from "@/components/CommandDialogProvider";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useNotesAPI } from "@/hooks/useNotesAPI";

interface DeleteNoteDialogProps {
    noteFileName: string;
    onSuccess?: () => void;
}

export function DeleteNoteDialog({ noteFileName, onSuccess }: DeleteNoteDialogProps) {
    const [isDeleting, setIsDeleting] = React.useState(false);
    const { closeDialog } = useCommandDialog();
    const { closeTabsWithNote } = useWorkspaceContext();
    const api = useNotesAPI();

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.deleteNote({ fileName: noteFileName });

            // Close all tabs with this note
            closeTabsWithNote(noteFileName);

            // Trigger refresh in browser view by calling getNotes
            // This will be picked up by any browser views that are listening
            await api.getNotes();
            
            closeDialog();
            onSuccess?.();
        } catch (error) {
            console.error("Failed to delete note:", error);
            // Could add error handling UI here
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>Delete Note?</DialogTitle>
                <DialogDescription>
                    Are you sure you want to delete "{noteFileName}"? This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="ghost" onClick={closeDialog}>
                    Cancel
                </Button>
                <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={isDeleting}
                >
                    {isDeleting ? "Deleting..." : "Delete"}
                </Button>
            </DialogFooter>
        </>
    );
}