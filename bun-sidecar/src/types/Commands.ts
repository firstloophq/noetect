import { z } from "zod";

export const CommandSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string(),
    // In Zod v4, z.function() is not a Zod schema; validate callbacks separately
    callback: z.any(),
    // Optional: Only show command when specific view/plugin is active
    when: z.optional(
        z.object({
            activeViewId: z.string().optional(),
            activePluginId: z.string().optional(),
        })
    ),
});

export const CommandCallback = z.function({
    input: [],
    output: z.union([z.void(), z.promise(z.void())]),
});

type CommandSchemaType = z.infer<typeof CommandSchema>;
export type Command = Omit<CommandSchemaType, "callback"> & {
    callback: () => void | Promise<void>;
};
