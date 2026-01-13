import { mkdir, readdir, stat } from "node:fs/promises";
import path from "path";
import { createServiceLogger } from "@/lib/logger";
import { getUploadsPath, hasActiveWorkspace } from "@/storage/root-path";

const logger = createServiceLogger("UPLOADS");

interface UploadedFile {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    createdAt: string;
}

function generateFileId(): string {
    return `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

async function ensureUploadsDir(): Promise<string> {
    const uploadsPath = getUploadsPath();
    await mkdir(uploadsPath, { recursive: true });
    return uploadsPath;
}

export const uploadsRoutes = {
    "/api/uploads/list": {
        async GET(): Promise<Response> {
            if (!hasActiveWorkspace()) {
                return Response.json({ uploads: [] });
            }

            try {
                const uploadsPath = getUploadsPath();

                // Ensure directory exists
                await mkdir(uploadsPath, { recursive: true });

                const files = await readdir(uploadsPath);
                const uploads: UploadedFile[] = [];

                for (const filename of files) {
                    // Skip non-image files
                    const ext = path.extname(filename).toLowerCase();
                    if (![".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
                        continue;
                    }

                    const filePath = path.join(uploadsPath, filename);
                    const fileStat = await stat(filePath);

                    // Extract ID from filename (upload-{timestamp}-{random}.ext)
                    const id = filename.replace(/\.[^.]+$/, "");

                    // Determine mime type from extension
                    const mimeTypes: Record<string, string> = {
                        ".jpg": "image/jpeg",
                        ".jpeg": "image/jpeg",
                        ".png": "image/png",
                        ".gif": "image/gif",
                        ".webp": "image/webp",
                    };

                    uploads.push({
                        id,
                        filename,
                        originalName: filename,
                        mimeType: mimeTypes[ext] || "application/octet-stream",
                        size: fileStat.size,
                        url: `/api/uploads/${filename}`,
                        createdAt: fileStat.birthtime.toISOString(),
                    });
                }

                // Sort by creation date, newest first
                uploads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                return Response.json({ uploads });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                logger.error(`Failed to list uploads: ${message}`);
                return Response.json({ uploads: [], error: message });
            }
        },
    },

    "/api/uploads": {
        async POST(req: Request): Promise<Response> {
            if (!hasActiveWorkspace()) {
                return Response.json({ error: "No active workspace" }, { status: 400 });
            }

            try {
                const contentType = req.headers.get("content-type") || "";

                if (!contentType.includes("multipart/form-data")) {
                    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
                }

                const formData = await req.formData();
                const file = formData.get("file");

                if (!file || !(file instanceof File)) {
                    return Response.json({ error: "No file provided" }, { status: 400 });
                }

                // Validate file type (images only for now)
                const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
                if (!allowedTypes.includes(file.type)) {
                    return Response.json({
                        error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}`
                    }, { status: 400 });
                }

                // Validate file size (max 10MB)
                const maxSize = 10 * 1024 * 1024;
                if (file.size > maxSize) {
                    return Response.json({ error: "File too large. Maximum 10MB" }, { status: 400 });
                }

                const uploadsPath = await ensureUploadsDir();
                const fileId = generateFileId();
                const ext = path.extname(file.name) || `.${file.type.split("/")[1]}`;
                const filename = `${fileId}${ext}`;
                const filePath = path.join(uploadsPath, filename);

                // Write file using Bun
                const arrayBuffer = await file.arrayBuffer();
                await Bun.write(filePath, arrayBuffer);

                const uploadedFile: UploadedFile = {
                    id: fileId,
                    filename,
                    originalName: file.name,
                    mimeType: file.type,
                    size: file.size,
                    url: `/api/uploads/${filename}`,
                    createdAt: new Date().toISOString(),
                };

                logger.info(`Uploaded file: ${filename}`, {
                    originalName: file.name,
                    size: file.size,
                    mimeType: file.type
                });

                return Response.json({ success: true, data: uploadedFile });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                logger.error(`Failed to upload file: ${message}`);
                return Response.json({ error: message }, { status: 500 });
            }
        },
    },

    "/api/uploads/*": {
        async GET(req: Request): Promise<Response> {
            if (!hasActiveWorkspace()) {
                return new Response("No active workspace", { status: 404 });
            }

            try {
                const url = new URL(req.url);
                const filename = url.pathname.replace("/api/uploads/", "");

                if (!filename || filename.includes("..")) {
                    return new Response("Invalid filename", { status: 400 });
                }

                const uploadsPath = getUploadsPath();
                const filePath = path.join(uploadsPath, filename);
                const file = Bun.file(filePath);

                if (!(await file.exists())) {
                    return new Response("File not found", { status: 404 });
                }

                const contentType = file.type || "application/octet-stream";

                return new Response(file, {
                    headers: {
                        "Content-Type": contentType,
                        "Cache-Control": "public, max-age=31536000, immutable",
                    },
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                logger.error(`Failed to serve file: ${message}`);
                return new Response("Failed to serve file", { status: 500 });
            }
        },
    },

    "/api/uploads/base64": {
        async POST(req: Request): Promise<Response> {
            if (!hasActiveWorkspace()) {
                return Response.json({ error: "No active workspace" }, { status: 400 });
            }

            try {
                const { data, mimeType, filename: originalName } = await req.json() as {
                    data: string;
                    mimeType: string;
                    filename?: string;
                };

                if (!data || !mimeType) {
                    return Response.json({ error: "Missing data or mimeType" }, { status: 400 });
                }

                // Validate mime type
                const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
                if (!allowedTypes.includes(mimeType)) {
                    return Response.json({
                        error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}`
                    }, { status: 400 });
                }

                // Decode base64
                const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, "base64");

                // Validate size
                const maxSize = 10 * 1024 * 1024;
                if (buffer.length > maxSize) {
                    return Response.json({ error: "File too large. Maximum 10MB" }, { status: 400 });
                }

                const uploadsPath = await ensureUploadsDir();
                const fileId = generateFileId();
                const ext = `.${mimeType.split("/")[1]}`;
                const filename = `${fileId}${ext}`;
                const filePath = path.join(uploadsPath, filename);

                await Bun.write(filePath, buffer);

                const uploadedFile: UploadedFile = {
                    id: fileId,
                    filename,
                    originalName: originalName || filename,
                    mimeType,
                    size: buffer.length,
                    url: `/api/uploads/${filename}`,
                    createdAt: new Date().toISOString(),
                };

                logger.info(`Uploaded base64 file: ${filename}`, {
                    size: buffer.length,
                    mimeType
                });

                return Response.json({ success: true, data: uploadedFile });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                logger.error(`Failed to upload base64 file: ${message}`);
                return Response.json({ error: message }, { status: 500 });
            }
        },
    },

    "/api/uploads/delete": {
        async POST(req: Request): Promise<Response> {
            if (!hasActiveWorkspace()) {
                return Response.json({ error: "No active workspace" }, { status: 400 });
            }

            try {
                const { filename } = await req.json() as { filename: string };

                if (!filename || filename.includes("..")) {
                    return Response.json({ error: "Invalid filename" }, { status: 400 });
                }

                const uploadsPath = getUploadsPath();
                const filePath = path.join(uploadsPath, filename);
                const file = Bun.file(filePath);

                if (!(await file.exists())) {
                    return Response.json({ error: "File not found" }, { status: 404 });
                }

                const { unlink } = await import("node:fs/promises");
                await unlink(filePath);

                logger.info(`Deleted file: ${filename}`);
                return Response.json({ success: true });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                logger.error(`Failed to delete file: ${message}`);
                return Response.json({ error: message }, { status: 500 });
            }
        },
    },
};
