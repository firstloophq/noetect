import { RouteHandler } from "../types/Routes";
import { getRootPath, hasActiveWorkspace } from "../storage/root-path";
import { readdir } from "node:fs/promises";

interface BaseDirResponse {
    success: boolean;
    rootPath: string;
    folders: string[];
    timestamp: string;
}

export const baseDirRoute: RouteHandler<BaseDirResponse> = {
    GET: async (_req) => {
        if (!hasActiveWorkspace()) {
            return Response.json({
                success: false,
                rootPath: "",
                folders: [],
                timestamp: new Date().toISOString(),
                error: "No active workspace"
            }, { status: 400 });
        }

        const rootPathValue = getRootPath();
        try {
            const entries = await readdir(rootPathValue, { withFileTypes: true });
            const folders = entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name)
                .sort();

            const response: BaseDirResponse = {
                success: true,
                rootPath: rootPathValue,
                folders,
                timestamp: new Date().toISOString()
            };

            return Response.json(response);
        } catch (error) {
            return Response.json({
                success: false,
                rootPath: rootPathValue,
                folders: [],
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : "Failed to read directory"
            }, { status: 500 });
        }
    }
};