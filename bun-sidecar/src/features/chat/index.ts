import { PluginBase, SerializablePlugin } from "@/types/Plugin";
import { z } from "zod";
import ChatBrowserView from "./browser-view";
import ChatView from "./chat-view";
import { FunctionStubs } from "@/types/Functions";
import { AttachmentSchema } from "@/types/attachments";

// Queued message schema for message queue feature
export const QueuedMessageSchema = z.object({
    id: z.string(),
    text: z.string(),
    attachments: z.array(AttachmentSchema),
    createdAt: z.string(),
});

export type QueuedMessage = z.infer<typeof QueuedMessageSchema>;

export const SessionMetadataSchema = z.object({
    id: z.string(),
    title: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    messageCount: z.number(),
    agentId: z.string().optional(),
});

export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;

export const MessageSchema = z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    blocks: z.array(z.union([
        z.object({ type: z.literal("text"), content: z.string(), id: z.string() }),
        z.object({ type: z.literal("thinking"), content: z.string(), id: z.string() }),
        z.object({
            type: z.literal("tool"),
            id: z.string(),
            toolCall: z.object({
                id: z.string(),
                name: z.string(),
                state: z.enum(["input-streaming", "input-available", "output-available", "output-error"]),
                input: z.record(z.string(), z.any()).optional(),
                output: z.any().optional(),
                errorText: z.string().optional(),
            }),
        }),
    ])),
});

export type ChatMessage = z.infer<typeof MessageSchema>;

export const functionStubs = {
    listSessions: {
        input: z.object({}),
        output: z.array(SessionMetadataSchema),
    },
    getSessionHistory: {
        input: z.object({ sessionId: z.string() }),
        output: z.array(z.unknown()),
    },
    saveSession: {
        input: z.object({
            id: z.string(),
            title: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
            messageCount: z.number(),
            agentId: z.string().optional(),
        }),
        output: z.object({ success: z.boolean() }),
    },
    updateSession: {
        input: z.object({
            id: z.string(),
            title: z.string().optional(),
            messageCount: z.number().optional(),
        }),
        output: z.object({ success: z.boolean() }),
    },
} satisfies FunctionStubs;

const views = {
    default: {
        id: "default",
        name: "Chat Browser",
        component: ChatBrowserView,
    },
    browser: {
        id: "browser",
        name: "Chat Browser",
        component: ChatBrowserView,
    },
    chat: {
        id: "chat",
        name: "Chat",
        component: ChatView,
        propsSchema: z.object({
            sessionId: z.string().optional(),
            initialPrompt: z.string().optional(),
        }),
    },
} as const;

export const chatPluginSerial: SerializablePlugin = {
    id: "chat",
    name: "Chat",
    icon: "bot-message-square",
};

export const ChatPluginBase: PluginBase = {
    id: chatPluginSerial.id,
    name: chatPluginSerial.name,
    icon: chatPluginSerial.icon,
    mcpServers: {},
    views,
    functionStubs: functionStubs,
    commands: [],
};
