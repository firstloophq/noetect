import { PluginInstance } from "@/types/Plugin";
import { getPlugin } from "@/registry/registry";
import React from "react";

interface ViewProps {
    pluginInstance: PluginInstance;
    viewPosition: "main" | "sidebar";
    tabId: string;
}

const View = React.memo(({ pluginInstance, tabId }: ViewProps) => {
    const plugin = getPlugin(pluginInstance.plugin.id);
    const instanceProps = pluginInstance.instanceProps;

    if (!plugin) {
        return null;
    }

    // Use default view if no specific view is specified
    const viewId = pluginInstance.viewId || "default";
    const viewDef = plugin.views[viewId];
    if (!viewDef) {
        return (
            <div className="h-full">
                <div className="text-red-500">View "{viewId}" not found</div>
            </div>
        );
    }

    const ViewComponent = viewDef.component;

    return (
        <div className="h-full">
            <ViewComponent {...instanceProps} tabId={tabId} />
        </div>
    );
});

View.displayName = "View";

export { View };
