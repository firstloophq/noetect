import { z } from "zod";

export const AttachmentSchema = z.object({
    id: z.string(),
    filename: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    size: z.number(),
    url: z.string(),
    createdAt: z.string(),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

export function isImageMimeType(mimeType: string): boolean {
    return mimeType.startsWith("image/");
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
