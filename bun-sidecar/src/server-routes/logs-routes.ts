import { RouteHandler } from "../types/Routes";
import { getLogFile } from "@/lib/logger";

interface LogsResponse {
    success: boolean;
    path?: string;
}

export const logsRoutes = {
    "/api/logs/reset": {
        POST: async () => {
            try {
                const logFile = getLogFile();
                await Bun.write(logFile, "");
                return Response.json({ success: true, path: logFile });
            } catch (error) {
                console.error("Failed to reset logs:", error);
                return Response.json({ success: false }, { status: 500 });
            }
        },
    } satisfies RouteHandler<LogsResponse>,

    "/api/logs/reveal": {
        POST: async () => {
            try {
                const logFile = getLogFile();
                Bun.spawn(["open", "-R", logFile]);
                return Response.json({ success: true, path: logFile });
            } catch (error) {
                console.error("Failed to reveal logs:", error);
                return Response.json({ success: false }, { status: 500 });
            }
        },
    } satisfies RouteHandler<LogsResponse>,

    "/api/logs/path": {
        GET: async () => {
            const logFile = getLogFile();
            return Response.json({ success: true, path: logFile });
        },
    } satisfies RouteHandler<LogsResponse>,
};
