// API routes for agents feature

import {
    getAgent,
    listAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    duplicateAgent,
    getPreferences,
    savePreferences,
    getMcpRegistry,
} from "@/features/agents/fx";

export const agentsRoutes = {
    "/api/agents/list": {
        async GET() {
            const agents = await listAgents();
            return Response.json(agents);
        },
    },

    "/api/agents/get": {
        async POST(req: Request) {
            const { agentId } = await req.json();
            const agent = await getAgent({ agentId });
            if (!agent) {
                return Response.json({ error: "Agent not found" }, { status: 404 });
            }
            return Response.json(agent);
        },
    },

    "/api/agents/create": {
        async POST(req: Request) {
            const args = await req.json();
            const agent = await createAgent(args);
            return Response.json(agent);
        },
    },

    "/api/agents/update": {
        async POST(req: Request) {
            const args = await req.json();
            const agent = await updateAgent(args);
            if (!agent) {
                return Response.json({ error: "Agent not found" }, { status: 404 });
            }
            return Response.json(agent);
        },
    },

    "/api/agents/delete": {
        async POST(req: Request) {
            const { agentId } = await req.json();
            const result = await deleteAgent({ agentId });
            return Response.json(result);
        },
    },

    "/api/agents/duplicate": {
        async POST(req: Request) {
            const { agentId } = await req.json();
            const agent = await duplicateAgent({ agentId });
            return Response.json(agent);
        },
    },

    "/api/agents/preferences": {
        async GET() {
            const preferences = await getPreferences();
            return Response.json(preferences);
        },
        async POST(req: Request) {
            const preferences = await req.json();
            await savePreferences(preferences);
            return Response.json({ success: true });
        },
    },

    "/api/mcp-registry": {
        async GET() {
            const registry = getMcpRegistry();
            return Response.json(registry);
        },
    },
};
