import { functions } from "@/features/skills/fx";

export const skillsRoutes = {
    "/api/skills/list": {
        async POST() {
            console.log("[Skills Route] /api/skills/list called");
            const result = await functions.getSkills.fx({});
            console.log("[Skills Route] Returning", result.length, "skills");
            return Response.json(result);
        },
    },
};
