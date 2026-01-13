import { useState, useEffect, useCallback } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { FolderOpen, Plus, ChevronDown, Check, Settings } from "lucide-react";
import { useWorkspaceSwitcher } from "@/hooks/useWorkspaceSwitcher";
import { useTheme } from "@/hooks/useTheme";
import { FolderPickerDialog } from "./FolderPickerDialog";
import { WorkspaceManager } from "./WorkspaceManager";

export function WorkspaceSwitcher() {
    const { workspaces, activeWorkspace, loading, switchWorkspace, addWorkspace } =
        useWorkspaceSwitcher();
    const { currentTheme } = useTheme();
    const [folderPickerOpen, setFolderPickerOpen] = useState(false);
    const [managerOpen, setManagerOpen] = useState(false);

    // Check if we're running in native macOS app
    const isNativeApp = Boolean(
        (window as Window & { webkit?: { messageHandlers?: { chooseDataRoot?: unknown } } }).webkit?.messageHandlers?.chooseDataRoot
    );

    // Set up callback for native folder picker
    const handleSetDataRoot = useCallback(
        (path: string) => {
            addWorkspace(path);
        },
        [addWorkspace]
    );

    useEffect(() => {
        (window as Window & { __setDataRoot?: (path: string) => void }).__setDataRoot = handleSetDataRoot;
        return () => {
            delete (window as Window & { __setDataRoot?: (path: string) => void }).__setDataRoot;
        };
    }, [handleSetDataRoot]);

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

    const handleFolderSelect = (path: string) => {
        addWorkspace(path);
    };

    if (loading) {
        return (
            <div
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md opacity-50"
                style={{ color: currentTheme.styles.contentSecondary }}
            >
                <FolderOpen className="size-4" />
                <span className="text-sm">Loading...</span>
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{
                    color: currentTheme.styles.contentPrimary,
                    backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.styles.surfaceAccent;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                }}
            >
                <FolderOpen className="size-4 shrink-0" />
                <span className="truncate flex-1 text-left text-sm">
                    {activeWorkspace?.name || "No Workspace"}
                </span>
                <ChevronDown className="size-3 opacity-50 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="w-56"
                style={{
                    backgroundColor: currentTheme.styles.surfacePrimary,
                    borderColor: currentTheme.styles.borderDefault,
                }}
            >
                {workspaces.map((ws) => (
                    <DropdownMenuItem
                        key={ws.id}
                        onClick={() => switchWorkspace(ws.id)}
                        className="cursor-pointer"
                        style={{ color: currentTheme.styles.contentPrimary }}
                    >
                        <FolderOpen className="size-4 mr-2 shrink-0" />
                        <span className="truncate flex-1">{ws.name}</span>
                        {ws.id === activeWorkspace?.id && (
                            <Check className="size-4 ml-2 shrink-0" />
                        )}
                    </DropdownMenuItem>
                ))}
                {workspaces.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                    onClick={handleAddWorkspace}
                    className="cursor-pointer"
                    style={{ color: currentTheme.styles.contentPrimary }}
                >
                    <Plus className="size-4 mr-2 shrink-0" />
                    <span>Add Workspace...</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setManagerOpen(true)}
                    className="cursor-pointer"
                    style={{ color: currentTheme.styles.contentPrimary }}
                >
                    <Settings className="size-4 mr-2 shrink-0" />
                    <span>Manage Workspaces...</span>
                </DropdownMenuItem>
            </DropdownMenuContent>

            <WorkspaceManager
                open={managerOpen}
                onOpenChange={setManagerOpen}
            />

            <FolderPickerDialog
                open={folderPickerOpen}
                onOpenChange={setFolderPickerOpen}
                onSelect={handleFolderSelect}
                title="Add Workspace"
                description="Select a folder to add as a new workspace."
            />
        </DropdownMenu>
    );
}
