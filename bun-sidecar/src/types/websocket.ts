import { z } from "zod";

// Base event structure with dot notation ID
export interface WebSocketEvent<T = unknown> {
    id: string; // e.g., "counter.update", "terminal.output", "file.content.update"
    payload: T;
    timestamp: number;
    clientId?: string;
}

// Schema type for defining events
export type EventSchema = {
    [eventId: string]: z.ZodSchema;
};

// Real-time API interface
export interface RealTimeAPI<T extends EventSchema> {
    on<K extends keyof T>(
        eventId: K, 
        handler: (data: z.infer<T[K]>) => void
    ): () => void;
    
    emit<K extends keyof T>(
        eventId: K,
        data: z.infer<T[K]>
    ): void;
    
    off<K extends keyof T>(
        eventId: K,
        handler?: (data: z.infer<T[K]>) => void
    ): void;
}

// WebSocket message types
export const WebSocketMessageSchema = z.object({
    type: z.enum(["event", "subscribe", "unsubscribe", "ping", "pong"]),
    id: z.string().optional(),
    payload: z.unknown().optional(),
    timestamp: z.number().optional(),
});

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

// Server-side WebSocket data
export interface WebSocketData {
    clientId: string;
    connectedAt: number;
    subscriptions: Set<string>;
}