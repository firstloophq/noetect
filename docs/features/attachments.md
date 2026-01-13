# Image & Attachment System

This document describes the image upload and attachment functionality for chat messages and todos.

## Overview

Users can attach images to:
1. **Chat messages** - Images are displayed in the conversation and sent to Claude
2. **Todos** - Images are stored as attachments and displayed in todo dialogs

All uploaded images are stored in the per-workspace `/uploads` folder.

## Storage

### Upload Location

Images are stored in the active workspace's uploads folder:
```
/path/to/workspace/uploads/
├── upload-1704067200000-abc123.png
├── upload-1704067201000-def456.jpg
└── ...
```

### File Naming

Files are named with a generated ID to avoid conflicts:
```
upload-{timestamp}-{random}.{extension}
```

### Supported Formats

- JPEG (`image/jpeg`)
- PNG (`image/png`)
- GIF (`image/gif`)
- WebP (`image/webp`)

### Size Limits

- Maximum file size: 10MB
- Images are stored at original resolution

## API Endpoints

### Upload Image (FormData)

```
POST /api/uploads
Content-Type: multipart/form-data

Form field: file (File)
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "upload-1704067200000-abc123",
    "filename": "upload-1704067200000-abc123.png",
    "originalName": "screenshot.png",
    "mimeType": "image/png",
    "size": 123456,
    "url": "/api/uploads/upload-1704067200000-abc123.png",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Upload Image (Base64)

```
POST /api/uploads/base64
Content-Type: application/json

{
  "data": "base64-encoded-image-data",
  "mimeType": "image/png",
  "filename": "optional-original-name.png"
}
```

### Serve Image

```
GET /api/uploads/{filename}
```

Returns the image file with appropriate `Content-Type` header and caching headers.

## Shared Types

**File:** `src/types/attachments.ts`

```typescript
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

export function isImageMimeType(mimeType: string): boolean;
export function formatFileSize(bytes: number): string;
```

## Shared Components

### ImageViewer

**File:** `src/components/ImageViewer.tsx`

Modal dialog for viewing images fullscreen:
- Zoom in/out controls
- Download button
- Close button (X or ESC)
- Double-click to reset zoom

```tsx
<ImageViewer
    open={isOpen}
    onOpenChange={setIsOpen}
    src="/api/uploads/image.png"
    alt="Description"
    filename="image.png"
/>
```

### AttachmentThumbnail

**File:** `src/components/AttachmentThumbnail.tsx`

Thumbnail component for displaying attachments:
- Shows image preview or file type icon
- Remove button on hover
- Click to open in ImageViewer
- Size variants: `sm` (48px), `md` (64px), `lg` (96px)

```tsx
<AttachmentThumbnail
    attachment={attachment}
    onRemove={() => handleRemove(attachment.id)}
    size="md"
/>
```

## Chat Integration

### Input Component

**File:** `src/components/prosemirror/ProseMirrorPromptInput.tsx`

The chat input supports three ways to attach images:

1. **Paste** - Cmd+V to paste from clipboard
2. **Drag & Drop** - Drag images into the input area
3. **Button** - Click the paperclip icon

Features:
- Attachment thumbnails displayed above the input
- Remove button on each thumbnail
- Drag overlay shows "Drop images here"
- Loading state during upload

### Context API

The `ProseMirrorPromptContext` exposes attachment management:

```typescript
type ProseMirrorPromptContextType = {
    // ... other fields
    attachments: Attachment[];
    addAttachment: (attachment: Attachment) => void;
    removeAttachment: (id: string) => void;
    clearAttachments: () => void;
    uploadFile: (file: File) => Promise<Attachment | null>;
};
```

### Submit Handler

The `onSubmit` callback receives both text and attachments:

```typescript
onSubmit: (params: {
    text: string;
    attachments: Attachment[]
}) => void | Promise<void>
```

### Message Display

**File:** `src/features/chat/chat-view.tsx`

Images are rendered as thumbnails in user messages:

```tsx
if (block.type === "image") {
    return (
        <img
            src={block.content}
            alt="Attached image"
            className="max-w-xs max-h-48 rounded-lg"
            onClick={() => window.open(block.content, "_blank")}
        />
    );
}
```

### Claude SDK Integration

**File:** `src/server-routes/chat-routes.ts`

When images are attached, the chat API:
1. Reads images from the uploads folder
2. Encodes them as base64
3. Constructs a multimodal `SDKUserMessage` with image content blocks
4. Sends via `AsyncIterable<SDKUserMessage>` to the Claude Agent SDK

```typescript
if (images && images.length > 0) {
    const contentBlocks: ContentBlock[] = [];

    for (const imageUrl of images) {
        const imageData = await readImageAsBase64(imageUrl);
        if (imageData) {
            contentBlocks.push({
                type: "image",
                source: {
                    type: "base64",
                    media_type: imageData.mediaType,
                    data: imageData.data,
                },
            });
        }
    }

    if (message) {
        contentBlocks.push({ type: "text", text: message });
    }

    // Create async iterable for multimodal message
    promptInput = generateUserMessage(); // yields SDKUserMessage
}
```

Images are sent as proper Anthropic API image content blocks, allowing Claude to see and analyze the attached images.

## Todo Integration

### Schema

**File:** `src/features/todos/todo-types.ts`

```typescript
export const TodoSchema = z.object({
    // ... other fields
    attachments: z.array(AttachmentSchema).optional(),
});
```

### CreateTodoDialog

**File:** `src/features/todos/CreateTodoDialog.tsx`

Features:
- Attachment thumbnails displayed after description
- Paperclip button in footer to add images
- Click thumbnails to view fullscreen
- Remove button on hover

### TaskCardEditor

**File:** `src/features/todos/TaskCardEditor.tsx`

Same attachment UI as CreateTodoDialog for editing existing todos.

### API Functions

**File:** `src/features/todos/fx.ts`

Both `createTodo` and `updateTodo` support the `attachments` field:

```typescript
async function createTodo(input: {
    title: string;
    // ... other fields
    attachments?: Attachment[];
})

async function updateTodo(input: {
    todoId: string;
    updates: {
        // ... other fields
        attachments?: Attachment[];
    };
})
```

## Content Block Types

**File:** `src/features/chat/sessionUtils.ts`

The chat message system includes an image block type:

```typescript
export type ContentBlock =
  | { type: "text"; content: string; id: string }
  | { type: "image"; content: string; id: string }
  | { type: "thinking"; content: string; id: string }
  | { type: "tool"; toolCall: ToolCall; id: string };
```

## File Summary

### New Files

| File | Description |
|------|-------------|
| `src/server-routes/uploads-routes.ts` | Upload API endpoints |
| `src/types/attachments.ts` | Shared attachment types |
| `src/components/ImageViewer.tsx` | Fullscreen image modal |
| `src/components/AttachmentThumbnail.tsx` | Thumbnail component |

### Modified Files

| File | Changes |
|------|---------|
| `src/storage/root-path.ts` | Added `getUploadsPath()` |
| `src/onStartup.ts` | Creates uploads directory |
| `src/server.ts` | Added uploads routes |
| `src/components/prosemirror/ProseMirrorPromptInput.tsx` | Attachment support |
| `src/features/chat/chat-view.tsx` | Image display, attach button |
| `src/features/chat/sessionUtils.ts` | Image content block type |
| `src/features/todos/todo-types.ts` | Attachments field |
| `src/features/todos/fx.ts` | Attachment handling |
| `src/features/todos/CreateTodoDialog.tsx` | Attachment UI |
| `src/features/todos/TaskCardEditor.tsx` | Attachment UI |
| `src/server-routes/chat-routes.ts` | Image handling for Claude |
