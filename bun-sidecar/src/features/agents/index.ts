import { z } from "zod";

// Model options available for agent configuration
// We use z.string() to allow custom model identifiers while providing predefined options
export const ModelSchema = z.string();

export type AgentModel = z.infer<typeof ModelSchema>;

// Predefined model options for quick selection
export const PREDEFINED_MODELS = [
    "claude-sonnet-4-5-20250929",
    "claude-opus-4-5-20251101",
    "claude-opus-4-20250514",
    "claude-3-5-haiku-20241022",
] as const;

// Display names for predefined models
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
    "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5",
    "claude-opus-4-5-20251101": "Claude Opus 4.5",
    "claude-opus-4-20250514": "Claude Opus 4",
    "claude-3-5-haiku-20241022": "Claude Haiku 3.5",
};

// Agent configuration schema
export const AgentConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    systemPrompt: z.string(),
    model: ModelSchema,
    mcpServers: z.array(z.string()), // Array of MCP server IDs from registry
    allowedTools: z.array(z.string()).optional(), // Tools that are always allowed (persisted permissions)
    isDefault: z.boolean().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Agent preferences schema
export const AgentPreferencesSchema = z.object({
    lastUsedAgentId: z.string(),
    defaultAgentAllowedTools: z.array(z.string()).optional(), // Allowed tools for the default agent
});

export type AgentPreferences = z.infer<typeof AgentPreferencesSchema>;

// MCP Server config types - supports stdio and SSE transports
const StdioConfigSchema = z.object({
    type: z.literal("stdio").optional(), // Default if not specified
    command: z.string(),
    args: z.array(z.string()),
    env: z.record(z.string(), z.string()).optional(),
});

const SseConfigSchema = z.object({
    type: z.literal("sse"),
    url: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
});

const HttpConfigSchema = z.object({
    type: z.literal("http"),
    url: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
});

const McpConfigSchema = z.union([StdioConfigSchema, SseConfigSchema, HttpConfigSchema]);

// MCP Server definition in the app registry
export const McpServerDefinitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    config: McpConfigSchema,
});

export type McpServerDefinition = z.infer<typeof McpServerDefinitionSchema>;
export type McpConfig = z.infer<typeof McpConfigSchema>;

// App-level MCP Server Registry (hardcoded, user selects from these)
export const MCP_REGISTRY: McpServerDefinition[] = [
    {
        id: "linear",
        name: "Linear",
        description: "Linear project management - issues, projects, teams",
        config: {
            type: "http",
            url: "https://mcp.linear.app/mcp",
        },
    },
    // Add more MCP servers here over time
];

// Default agent that ships with the app
export const DEFAULT_AGENT: AgentConfig = {
    id: "default",
    name: "General Assistant",
    description: "A general-purpose coding assistant",
    systemPrompt: "", // Empty = uses SDK's default Claude Code system prompt
    model: "claude-sonnet-4-5-20250929",
    mcpServers: [], // No MCP servers enabled by default
    allowedTools: [], // No tools pre-allowed
    isDefault: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
};

// Default preferences
export const DEFAULT_PREFERENCES: AgentPreferences = {
    lastUsedAgentId: "default",
};
