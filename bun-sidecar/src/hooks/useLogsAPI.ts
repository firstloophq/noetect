interface LogsResponse {
    success: boolean;
    path?: string;
}

export const logsAPI = {
    reset: async (): Promise<LogsResponse> => {
        const response = await fetch("/api/logs/reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return response.json();
    },

    reveal: async (): Promise<LogsResponse> => {
        const response = await fetch("/api/logs/reveal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return response.json();
    },

    getPath: async (): Promise<LogsResponse> => {
        const response = await fetch("/api/logs/path", {
            method: "GET",
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return response.json();
    },
};

export function useLogsAPI() {
    return logsAPI;
}
