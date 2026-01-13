import { readdir, stat, mkdir } from "node:fs/promises";
import path from "path";
import { createServiceLogger } from "@/lib/logger";

const logger = createServiceLogger("FILESYSTEM");

interface DirectoryEntry {
    name: string;
    path: string;
    isDirectory: boolean;
}

interface ListDirectoryResponse {
    path: string;
    parent: string | null;
    entries: DirectoryEntry[];
}

async function listDirectory(dirPath: string): Promise<ListDirectoryResponse> {
    logger.info(`Listing directory: ${dirPath}`);

    try {
        const entries = await readdir(dirPath, { withFileTypes: true });

        const directoryEntries: DirectoryEntry[] = [];

        for (const entry of entries) {
            // Skip hidden files/folders (starting with .)
            if (entry.name.startsWith(".")) continue;

            const fullPath = path.join(dirPath, entry.name);

            // Only include directories
            if (entry.isDirectory()) {
                // Skip system directories that shouldn't be browsed
                const skipDirs = ["node_modules", "Library", "Applications", ".Trash"];
                if (skipDirs.includes(entry.name)) continue;

                directoryEntries.push({
                    name: entry.name,
                    path: fullPath,
                    isDirectory: true,
                });
            }
        }

        // Sort alphabetically
        directoryEntries.sort((a, b) => a.name.localeCompare(b.name));

        // Calculate parent path
        const parent = dirPath === "/" ? null : path.dirname(dirPath);

        return {
            path: dirPath,
            parent,
            entries: directoryEntries,
        };
    } catch (error) {
        logger.error(`Failed to list directory: ${dirPath}`, { error });
        throw error;
    }
}

async function getQuickAccessPaths(): Promise<DirectoryEntry[]> {
    const home = process.env.HOME || "/";
    const quickAccess: DirectoryEntry[] = [];

    const potentialPaths = [
        { name: "Home", path: home },
        { name: "Documents", path: path.join(home, "Documents") },
        { name: "Desktop", path: path.join(home, "Desktop") },
        { name: "Downloads", path: path.join(home, "Downloads") },
        { name: "Projects", path: path.join(home, "Projects") },
        { name: "Developer", path: path.join(home, "Developer") },
        { name: "Code", path: path.join(home, "Code") },
    ];

    for (const entry of potentialPaths) {
        try {
            const stats = await stat(entry.path);
            if (stats.isDirectory()) {
                quickAccess.push({
                    name: entry.name,
                    path: entry.path,
                    isDirectory: true,
                });
            }
        } catch {
            // Directory doesn't exist, skip it
        }
    }

    return quickAccess;
}

export const filesystemRoutes = {
    "/api/filesystem/list": {
        async POST(req: Request) {
            try {
                const { path: dirPath } = await req.json();

                if (!dirPath || typeof dirPath !== "string") {
                    return Response.json({ error: "Path is required" }, { status: 400 });
                }

                // Resolve the path to handle ~ and relative paths
                const resolvedPath = dirPath.startsWith("~")
                    ? path.join(process.env.HOME || "/", dirPath.slice(1))
                    : path.resolve(dirPath);

                const result = await listDirectory(resolvedPath);
                return Response.json(result);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                return Response.json({ error: message }, { status: 500 });
            }
        },
    },

    "/api/filesystem/quick-access": {
        async GET() {
            try {
                const paths = await getQuickAccessPaths();
                return Response.json({ paths });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                return Response.json({ error: message }, { status: 500 });
            }
        },
    },

    "/api/filesystem/validate": {
        async POST(req: Request) {
            try {
                const { path: dirPath } = await req.json();

                if (!dirPath || typeof dirPath !== "string") {
                    return Response.json({ valid: false, error: "Path is required" });
                }

                const resolvedPath = dirPath.startsWith("~")
                    ? path.join(process.env.HOME || "/", dirPath.slice(1))
                    : path.resolve(dirPath);

                try {
                    const stats = await stat(resolvedPath);
                    if (stats.isDirectory()) {
                        return Response.json({ valid: true, path: resolvedPath });
                    } else {
                        return Response.json({ valid: false, error: "Path is not a directory" });
                    }
                } catch {
                    return Response.json({ valid: false, error: "Directory does not exist" });
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                return Response.json({ valid: false, error: message });
            }
        },
    },

    "/api/filesystem/create-folder": {
        async POST(req: Request) {
            try {
                const { parentPath, folderName } = await req.json();

                if (!parentPath || typeof parentPath !== "string") {
                    return Response.json({ success: false, error: "Parent path is required" }, { status: 400 });
                }

                if (!folderName || typeof folderName !== "string") {
                    return Response.json({ success: false, error: "Folder name is required" }, { status: 400 });
                }

                // Validate folder name (no path separators or special chars)
                if (folderName.includes("/") || folderName.includes("\\") || folderName.startsWith(".")) {
                    return Response.json({ success: false, error: "Invalid folder name" }, { status: 400 });
                }

                const resolvedParent = parentPath.startsWith("~")
                    ? path.join(process.env.HOME || "/", parentPath.slice(1))
                    : path.resolve(parentPath);

                const newFolderPath = path.join(resolvedParent, folderName);

                // Check if folder already exists
                try {
                    await stat(newFolderPath);
                    return Response.json({ success: false, error: "Folder already exists" }, { status: 400 });
                } catch {
                    // Folder doesn't exist, which is what we want
                }

                // Create the folder
                await mkdir(newFolderPath, { recursive: true });
                logger.info(`Created folder: ${newFolderPath}`);

                return Response.json({ success: true, path: newFolderPath });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                logger.error(`Failed to create folder: ${message}`);
                return Response.json({ success: false, error: message }, { status: 500 });
            }
        },
    },
};
