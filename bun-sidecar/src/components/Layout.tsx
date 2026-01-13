import { SidebarInset, SidebarProvider } from "./ui/sidebar";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { Workspace } from "./Workspace";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "./ui/context-menu";

// Title bar height for macOS custom title bar (traffic lights area)
export const TITLE_BAR_HEIGHT = 52;
// Inset from left edge for traffic lights (close/minimize/maximize buttons)
export const TRAFFIC_LIGHTS_WIDTH = 78;

export function Layout() {
    return (
        <SidebarProvider>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div className="flex h-screen w-full overflow-hidden">
                        <WorkspaceSidebar />
                        <SidebarInset className="flex-1 min-w-0 min-h-0 overflow-hidden">
                            <Workspace />
                        </SidebarInset>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem>Hello world</ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </SidebarProvider>
    );
}
