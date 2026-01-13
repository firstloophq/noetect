import { z } from "zod";
import { PluginInstanceSchema } from "./Plugin";

export const WorkspaceTabSchema = z.object({
    id: z.string(),
    title: z.string(),
    pluginInstance: PluginInstanceSchema,
});

export const McpServerStatusSchema = z.object({
    serverId: z.string(),
    enabled: z.boolean(),
});

export const ProjectPreferencesSchema = z.object({
    hideLaterColumn: z.boolean().default(false),
});

export const WorkspaceStateSchema = z.object({
    tabs: z.array(WorkspaceTabSchema),
    activeTabId: z.string().nullable(),
    sidebarOpen: z.boolean().default(false),
    sidebarTabId: z.string().nullable(),
    mcpServerConfigs: z.array(McpServerStatusSchema).default([]),
    themeName: z.string().default("Light"),
    projectPreferences: z.record(z.string(), ProjectPreferencesSchema).default({}),
});

export type WorkspaceTab = z.infer<typeof WorkspaceTabSchema>;
export type McpServerStatus = z.infer<typeof McpServerStatusSchema>;
export type ProjectPreferences = z.infer<typeof ProjectPreferencesSchema>;
export type WorkspaceState = z.infer<typeof WorkspaceStateSchema>;
