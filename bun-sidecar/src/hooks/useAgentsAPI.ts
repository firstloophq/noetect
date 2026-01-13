import type { AgentConfig, AgentPreferences, McpServerDefinition } from "@/features/agents/index";

interface CreateAgentInput {
    name: string;
    description?: string;
    systemPrompt: string;
    model: AgentConfig["model"];
    mcpServers: string[];
}

interface UpdateAgentInput {
    agentId: string;
    updates: {
        name?: string;
        description?: string;
        systemPrompt?: string;
        model?: AgentConfig["model"];
        mcpServers?: string[];
    };
}

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/agents/${endpoint}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return response.json();
}

// Standalone API object for use outside React components
export const agentsAPI = {
    listAgents: () => fetchAPI<AgentConfig[]>("list", { method: "GET" }),

    getAgent: (args: { agentId: string }) =>
        fetchAPI<AgentConfig>("get", { method: "POST", body: JSON.stringify(args) }),

    createAgent: (args: CreateAgentInput) =>
        fetchAPI<AgentConfig>("create", { method: "POST", body: JSON.stringify(args) }),

    updateAgent: (args: UpdateAgentInput) =>
        fetchAPI<AgentConfig>("update", { method: "POST", body: JSON.stringify(args) }),

    deleteAgent: (args: { agentId: string }) =>
        fetchAPI<{ success: boolean }>("delete", { method: "POST", body: JSON.stringify(args) }),

    duplicateAgent: (args: { agentId: string }) =>
        fetchAPI<AgentConfig>("duplicate", { method: "POST", body: JSON.stringify(args) }),

    getPreferences: () => fetchAPI<AgentPreferences>("preferences", { method: "GET" }),

    savePreferences: (preferences: AgentPreferences) =>
        fetchAPI<{ success: boolean }>("preferences", {
            method: "POST",
            body: JSON.stringify(preferences),
        }),

    getMcpRegistry: () =>
        fetch("/api/mcp-registry", { method: "GET" }).then((r) => r.json()) as Promise<McpServerDefinition[]>,
};

// Hook wrapper for use in React components
export function useAgentsAPI() {
    return agentsAPI;
}
