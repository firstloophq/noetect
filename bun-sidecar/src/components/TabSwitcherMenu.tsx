import * as React from "react";
import { FileText, Settings, Workflow, CheckSquare, Bot, Mic, Code } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";

const iconMap = {
    file: FileText,
    workflow: Workflow,
    "bot-message-square": Bot,
    "list-todo": CheckSquare,
    mic: Mic,
    semicolon: Code,
    settings: Settings,
};

export function TabSwitcherMenu() {
    const [open, setOpen] = React.useState(false);
    const { tabs, activeTab, setActiveTabId } = useWorkspaceContext();
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    // Keyboard shortcut handler - CMD+O
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "o" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Focus input when dialog opens
    React.useEffect(() => {
        if (open) {
            // Next tick to ensure input exists
            const t = setTimeout(() => inputRef.current?.focus(), 0);
            return () => clearTimeout(t);
        }
    }, [open]);

    const handleSelectTab = (tabId: string) => {
        setActiveTabId(tabId);
        setOpen(false);
    };

    // Filter out the current active tab and sort tabs
    const sortedTabs = React.useMemo(() => {
        if (!tabs) {
            return [];
        }

        const filtered = tabs.filter((tab) => tab.id !== activeTab?.id);

        return filtered.sort((a, b) => {
            // Sort by last accessed time if available, otherwise by creation order
            return b.id.localeCompare(a.id);
        });
    }, [tabs, activeTab]);

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput ref={inputRef} placeholder="Switch to tab..." />
            <CommandList>
                {sortedTabs.length === 0 ? (
                    <CommandEmpty>No other tabs open.</CommandEmpty>
                ) : (
                    <CommandGroup heading="Open Tabs">
                        {sortedTabs.map((tab) => {
                            const IconComponent = iconMap[tab.pluginInstance?.plugin.icon as keyof typeof iconMap] || FileText;
                            const displayTitle = tab.title || tab.pluginInstance?.plugin.name || "Untitled";
                            const pluginName = tab.pluginInstance?.plugin.name;
                            const viewName = tab.pluginInstance?.viewId !== "default" ? tab.pluginInstance?.viewId : null;

                            return (
                                <CommandItem key={tab.id} onSelect={() => handleSelectTab(tab.id)}>
                                    <IconComponent className="mr-2 h-4 w-4" />
                                    <div className="flex flex-col">
                                        <span>{displayTitle}</span>
                                        {pluginName && (
                                            <span className="text-xs text-muted-foreground">
                                                {pluginName}
                                                {viewName ? ` - ${viewName}` : ""}
                                            </span>
                                        )}
                                    </div>
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}
