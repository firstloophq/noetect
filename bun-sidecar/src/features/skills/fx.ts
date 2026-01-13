import { functionStubs, Skill } from "./index";
import { FunctionsFromStubs } from "@/types/Functions";
import { getSkillsPath, hasActiveWorkspace } from "@/storage/root-path";
import { readdir, stat } from "node:fs/promises";
import path from "path";
import yaml from "js-yaml";

type SkillFrontMatter = {
    name?: string;
    title?: string;
    description?: string;
};

function formatAsTitle(name: string): string {
    return name
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function parseFrontMatter(content: string): { frontMatter: SkillFrontMatter | undefined; body: string } {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
    const match = content.match(frontMatterRegex);

    if (!match) {
        return { frontMatter: undefined, body: content };
    }

    try {
        const frontMatterYaml = match[1];
        const frontMatter = yaml.load(frontMatterYaml) as SkillFrontMatter;
        const body = content.slice(match[0].length);
        return { frontMatter, body };
    } catch {
        return { frontMatter: undefined, body: content };
    }
}

async function getSkills(): Promise<Skill[]> {
    if (!hasActiveWorkspace()) {
        console.log("[Skills] No active workspace, returning empty array");
        return [];
    }

    const skillsPathValue = getSkillsPath();
    try {
        console.log("[Skills] Looking for skills at path:", skillsPathValue);

        // Check if skills directory exists using stat instead of Bun.file (which is for files, not directories)
        let exists = false;
        try {
            const dirStat = await stat(skillsPathValue);
            exists = dirStat.isDirectory();
            console.log("[Skills] Directory exists:", exists);
        } catch {
            console.log("[Skills] Directory does not exist or cannot be accessed");
            exists = false;
        }

        if (!exists) {
            console.log("[Skills] Skills directory not found, returning empty array");
            return [];
        }

        // Read all entries in the skills directory
        const entries = await readdir(skillsPathValue);
        console.log("[Skills] Found entries:", entries);
        const skills: Skill[] = [];

        for (const entry of entries) {
            const entryPath = path.join(skillsPathValue, entry);
            const entryStat = await stat(entryPath);

            // Only process directories
            if (!entryStat.isDirectory()) {
                continue;
            }

            // Skip hidden directories
            if (entry.startsWith(".")) {
                continue;
            }

            // Try to read SKILL.md for metadata
            const skillMdPath = path.join(entryPath, "SKILL.md");
            const skillMdFile = Bun.file(skillMdPath);
            let preview = "";
            let skillName = entry;
            let skillTitle = formatAsTitle(entry);

            if (await skillMdFile.exists()) {
                const content = await skillMdFile.text();
                const { frontMatter } = parseFrontMatter(content);

                // Use description from frontmatter if available
                if (frontMatter?.description) {
                    preview = frontMatter.description;
                }
                // Use name from frontmatter if available
                if (frontMatter?.name) {
                    skillName = frontMatter.name;
                }
                // Use title from frontmatter, or format the name
                if (frontMatter?.title) {
                    skillTitle = frontMatter.title;
                }
            }

            skills.push({
                name: skillName,
                title: skillTitle,
                preview,
            });
        }

        // Sort alphabetically by name
        skills.sort((a, b) => a.name.localeCompare(b.name));

        return skills;
    } catch (error) {
        console.error("Failed to get skills:", error);
        return [];
    }
}

export const functions: FunctionsFromStubs<typeof functionStubs> = {
    getSkills: { ...functionStubs.getSkills, fx: getSkills },
};
