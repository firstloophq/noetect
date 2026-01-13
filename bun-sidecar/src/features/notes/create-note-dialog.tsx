import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { useCommandDialog } from "@/components/CommandDialogProvider";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useNotesAPI } from "@/hooks/useNotesAPI";
import { notesPluginSerial } from "@/features/notes";
import { KeyboardIndicator } from "@/components/KeyboardIndicator";
import { useNativeSubmit } from "@/hooks/useNativeKeyboardBridge";

interface CreateNoteDialogProps {
    onSuccess?: (fileName: string) => void;
}

export function CreateNoteDialog({ onSuccess }: CreateNoteDialogProps) {
    const [noteName, setNoteName] = React.useState("");
    const [isCreating, setIsCreating] = React.useState(false);
    const { closeDialog } = useCommandDialog();
    const { addNewTab, setActiveTabId } = useWorkspaceContext();
    const api = useNotesAPI();

    const doCreate = React.useCallback(async () => {
        if (!noteName.trim() || isCreating) return;

        setIsCreating(true);
        try {
            // Sanitize filename - remove any path separators and add .md extension
            const fileName = noteName.trim().replace(/[/\\]/g, "-") + ".md";

            // Create the note via API
            await api.saveNote({
                fileName,
                content: ""
            });

            // Open the note in editor
            const newTab = addNewTab({
                pluginMeta: notesPluginSerial,
                view: "editor",
                props: { noteFileName: fileName }
            });

            if (newTab) {
                setActiveTabId(newTab.id);
            }

            // Clear form state before closing
            setNoteName("");
            closeDialog();
            onSuccess?.(fileName);
        } catch (error) {
            console.error("Failed to create note:", error);
            // Could add error handling UI here
        } finally {
            setIsCreating(false);
        }
    }, [noteName, isCreating, addNewTab, setActiveTabId, closeDialog, onSuccess, api]);

    const handleSubmit = React.useCallback((e: React.FormEvent) => {
        e.preventDefault();
        doCreate();
    }, [doCreate]);

    // Handle CMD+Enter from native Mac app (Swift calls __nativeSubmit)
    useNativeSubmit(doCreate);

    // Handle CMD+Enter in browser (fallback for non-native environment)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                doCreate();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [doCreate]);

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                        Name
                    </Label>
                    <Input
                        id="name"
                        value={noteName}
                        onChange={(e) => setNoteName(e.target.value)}
                        placeholder="My New Note"
                        className="col-span-3"
                        autoFocus
                    />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                </Button>
                <Button type="submit" disabled={!noteName.trim() || isCreating}>
                    {isCreating ? "Creating..." : "Create Note"}
                    <KeyboardIndicator keys={["cmd", "enter"]} />
                </Button>
            </DialogFooter>
        </form>
    );
}