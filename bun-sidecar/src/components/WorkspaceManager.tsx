import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useWorkspaceSwitcher } from "@/hooks/useWorkspaceSwitcher";
import { FolderPickerDialog } from "./FolderPickerDialog";
import {
    Folder,
    FolderOpen,
    Plus,
    Trash2,
    Check,
    AlertCircle,
} from "lucide-react";

interface WorkspaceManagerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WorkspaceManager({ open, onOpenChange }: WorkspaceManagerProps) {
    const { currentTheme } = useTheme();
    const { styles } = currentTheme;
    const {
        workspaces,
        activeWorkspace,
        switchWorkspace,
        addWorkspace,
        removeWorkspace,
    } = useWorkspaceSwitcher();

    const [folderPickerOpen, setFolderPickerOpen] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

    // Check if we're running in native macOS app
    const isNativeApp = Boolean(
        (window as Window & { webkit?: { messageHandlers?: { chooseDataRoot?: unknown } } }).webkit?.messageHandlers?.chooseDataRoot
    );

    const handleAddWorkspace = () => {
        if (isNativeApp) {
            // Use native folder picker in macOS app
            const webkit = window.webkit as { messageHandlers?: { chooseDataRoot?: { postMessage: (data: Record<string, never>) => void } } } | undefined;
            webkit?.messageHandlers?.chooseDataRoot?.postMessage({});
        } else {
            // Use web-based folder picker in browser/dev mode
            setFolderPickerOpen(true);
        }
    };

    const handleFolderSelect = async (path: string) => {
        await addWorkspace(path);
    };

    const handleRemoveWorkspace = async (workspaceId: string) => {
        if (confirmRemoveId !== workspaceId) {
            // First click - show confirmation
            setConfirmRemoveId(workspaceId);
            return;
        }

        // Second click - actually remove
        setRemovingId(workspaceId);
        try {
            await removeWorkspace(workspaceId);
            setConfirmRemoveId(null);
        } finally {
            setRemovingId(null);
        }
    };

    const handleSwitchWorkspace = async (workspaceId: string) => {
        await switchWorkspace(workspaceId);
        onOpenChange(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent size="md">
                    <DialogHeader>
                        <DialogTitle>Workspace Manager</DialogTitle>
                        <DialogDescription>
                            Manage your workspaces. Each workspace stores its own todos, notes, and settings.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-2 py-4">
                        {workspaces.length === 0 ? (
                            <div
                                className="text-center py-8"
                                style={{ color: styles.contentSecondary }}
                            >
                                <Folder className="size-12 mx-auto mb-2 opacity-50" />
                                <p>No workspaces configured</p>
                                <p className="text-sm">Add a workspace to get started</p>
                            </div>
                        ) : (
                            <div
                                className="border rounded-lg overflow-hidden"
                                style={{ borderColor: styles.borderDefault }}
                            >
                                {workspaces.map((workspace, index) => {
                                    const isActive = workspace.id === activeWorkspace?.id;
                                    const isConfirming = confirmRemoveId === workspace.id;
                                    const isRemoving = removingId === workspace.id;

                                    return (
                                        <div
                                            key={workspace.id}
                                            className="flex items-center gap-3 p-3"
                                            style={{
                                                backgroundColor: isActive
                                                    ? styles.surfaceAccent
                                                    : "transparent",
                                                borderTop: index > 0 ? `1px solid ${styles.borderDefault}` : undefined,
                                            }}
                                        >
                                            {isActive ? (
                                                <FolderOpen
                                                    className="size-5 shrink-0"
                                                    style={{ color: styles.contentPrimary }}
                                                />
                                            ) : (
                                                <Folder
                                                    className="size-5 shrink-0"
                                                    style={{ color: styles.contentSecondary }}
                                                />
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <div
                                                    className="font-medium truncate"
                                                    style={{ color: styles.contentPrimary }}
                                                >
                                                    {workspace.name}
                                                    {isActive && (
                                                        <span
                                                            className="ml-2 text-xs font-normal"
                                                            style={{ color: styles.contentSecondary }}
                                                        >
                                                            (Active)
                                                        </span>
                                                    )}
                                                </div>
                                                <div
                                                    className="text-xs truncate"
                                                    style={{ color: styles.contentTertiary }}
                                                >
                                                    {workspace.path}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                {!isActive && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleSwitchWorkspace(workspace.id)}
                                                        title="Switch to this workspace"
                                                    >
                                                        <Check className="size-4" />
                                                        Switch
                                                    </Button>
                                                )}

                                                <Button
                                                    variant={isConfirming ? "destructive" : "ghost"}
                                                    size="sm"
                                                    onClick={() => handleRemoveWorkspace(workspace.id)}
                                                    disabled={isRemoving}
                                                    title={isConfirming ? "Click again to confirm" : "Remove workspace"}
                                                    onBlur={() => setConfirmRemoveId(null)}
                                                >
                                                    {isConfirming ? (
                                                        <>
                                                            <AlertCircle className="size-4" />
                                                            Confirm
                                                        </>
                                                    ) : (
                                                        <Trash2 className="size-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <Button
                            variant="outline"
                            onClick={handleAddWorkspace}
                            className="w-full mt-2"
                        >
                            <Plus className="size-4" />
                            Add Workspace
                        </Button>
                    </div>

                    <div
                        className="text-xs"
                        style={{ color: styles.contentTertiary }}
                    >
                        Note: Removing a workspace only removes it from this list. Your files are not deleted.
                    </div>
                </DialogContent>
            </Dialog>

            <FolderPickerDialog
                open={folderPickerOpen}
                onOpenChange={setFolderPickerOpen}
                onSelect={handleFolderSelect}
                title="Add Workspace"
                description="Select a folder to add as a new workspace."
            />
        </>
    );
}
