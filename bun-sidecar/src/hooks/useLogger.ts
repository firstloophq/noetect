import { useCallback } from "react";

export interface LogEvent {
    event: string;
    data?: unknown;
    level?: "info" | "warn" | "error" | "debug";
    context?: string;
}

export function useLogger() {
    const logEvent = useCallback(async (event: string, data?: unknown, level: "info" | "warn" | "error" | "debug" = "info", context?: string) => {
        try {
            const logPayload: LogEvent = {
                event,
                level,
                ...(data !== undefined ? { data } : {}),
                ...(typeof context === "string" && context.length > 0 ? { context } : {}),
            };

            await fetch("/api/logs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(logPayload),
            });
        } catch (error) {
            console.error("Failed to log event:", error);
        }
    }, []);

    const info = useCallback(
        (event: string, data?: unknown, context?: string) => {
            return logEvent(event, data, "info", context);
        },
        [logEvent]
    );

    const warn = useCallback(
        (event: string, data?: unknown, context?: string) => {
            return logEvent(event, data, "warn", context);
        },
        [logEvent]
    );

    const error = useCallback(
        (event: string, data?: unknown, context?: string) => {
            return logEvent(event, data, "error", context);
        },
        [logEvent]
    );

    const debug = useCallback(
        (event: string, data?: unknown, context?: string) => {
            return logEvent(event, data, "debug", context);
        },
        [logEvent]
    );

    return {
        logEvent,
        info,
        warn,
        error,
        debug,
    };
}
