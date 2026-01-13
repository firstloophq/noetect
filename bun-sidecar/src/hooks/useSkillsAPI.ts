import { Skill } from "@/features/skills";

async function fetchAPI<T>(endpoint: string, body: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(`/api/skills/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return response.json();
}

export const skillsAPI = {
    getSkills: () => fetchAPI<Skill[]>("list"),
};

export function useSkillsAPI() {
    return skillsAPI;
}
