# Message Queue

This feature allows users to queue messages while the AI is responding, enabling a continuous workflow without waiting for each response to complete.

## Overview

When Claude is processing a message, users can continue typing and queue additional messages. These queued messages are automatically sent one-by-one as each response completes.

Key capabilities:
- **Queue while streaming** - Type and queue messages while AI is responding
- **Visual queue management** - See, edit, reorder, and remove queued messages
- **Automatic processing** - Queue processes automatically when responses complete
- **Error handling** - Queue pauses on errors, preserving remaining messages

## User Interface

### During Streaming

When the AI is responding, the input area changes:

```
┌─────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────┐ │
│ │ ≡ "Refactor the auth module"            ✎ ✕ │ │  ← Queued messages
│ │ ≡ "Add tests for the changes"           ✎ ✕ │ │    (draggable)
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ Type to queue next message...               │ │  ← Placeholder changes
│ └─────────────────────────────────────────────┘ │
│                              [Stop] [Queue ⊕]   │  ← Two buttons
└─────────────────────────────────────────────────┘
```

- **Placeholder** changes to "Type to queue next message..."
- **Queue button** (ListPlus icon) replaces the Send button
- **Stop button** appears alongside Queue button
- **Queued messages** appear above the input

### Queue Management

Each queued message card supports:
- **Drag handle** (≡) - Reorder messages by dragging
- **Edit button** (✎) - Click to edit message text inline
- **Remove button** (✕) - Remove message from queue
- **Attachment indicator** - Shows image count if message has attachments

Header shows queue count with "Clear all" button.

### Queue Paused State

When queue pauses (due to error or cancellation):

```
┌─────────────────────────────────────────────────┐
│ Queue paused (2 remaining)            [Resume]  │
└─────────────────────────────────────────────────┘
```

Click "Resume" to continue processing the queue.

## Behavior

### Queue Processing Flow

1. User sends initial message → AI starts responding
2. User types another message, clicks Queue (or presses Enter)
3. Message added to queue, displayed above input
4. AI finishes responding → `isLoading` becomes false
5. Effect detects queue has items → automatically sends next message
6. Repeat until queue is empty

### Error Handling

**On Error:**
- Queue pauses immediately
- Toast notification: "Queue paused due to error. X messages remaining."
- Remaining messages preserved in queue
- User can fix issue and click "Resume"

**On Cancel:**
- Queue pauses immediately
- Toast notification: "Queue paused. X messages remaining."
- User can click "Resume" to continue

### Attachments

- Queued messages can include image attachments
- Attachments are already uploaded when queued
- Queue item shows attachment count indicator
- Attachments sent with message when processed

## Data Types

### QueuedMessage Schema

**File:** `src/features/chat/index.ts`

```typescript
const QueuedMessageSchema = z.object({
    id: z.string(),           // UUID
    text: z.string(),         // Message text
    attachments: z.array(AttachmentSchema),  // Image attachments
    createdAt: z.string(),    // ISO timestamp
});

type QueuedMessage = z.infer<typeof QueuedMessageSchema>;
```

## State Management

### Queue State

**File:** `src/features/chat/chat-view.tsx`

```typescript
// Queue of pending messages
const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);

// Whether queue processing is paused
const [queuePaused, setQueuePaused] = useState(false);

// Ref to prevent double-processing
const isProcessingQueueRef = useRef(false);
```

### Queue Processing Effect

```typescript
useEffect(() => {
    if (!isLoading && messageQueue.length > 0 && !queuePaused && !isProcessingQueueRef.current) {
        isProcessingQueueRef.current = true;
        const nextMessage = messageQueue[0];
        setMessageQueue((prev) => prev.slice(1));

        // Small delay to ensure state is settled
        setTimeout(() => {
            handleSubmitRef.current?.({
                text: nextMessage.text,
                attachments: nextMessage.attachments
            });
        }, 50);
    }
}, [isLoading, messageQueue, queuePaused]);
```

**Important:** The effect intentionally does not return a cleanup function. Returning one would clear the timeout when `setMessageQueue` triggers a re-render, breaking the queue processing.

## Components

### QueuedMessagesList

**File:** `src/features/chat/QueuedMessagesList.tsx`

Renders the queue UI with drag-to-reorder support.

```typescript
interface QueuedMessagesListProps {
    messages: QueuedMessage[];
    onRemove: (id: string) => void;
    onEdit: (id: string, text: string) => void;
    onReorder: (messages: QueuedMessage[]) => void;
    onClearAll: () => void;
}
```

Uses `@dnd-kit/sortable` for drag-to-reorder functionality.

### SortableQueueItem

Internal component for each queue item:
- Drag handle with grip icon
- Truncated message preview (50 chars max)
- Inline editing mode
- Attachment count indicator
- Edit/Remove buttons (visible on hover)

## Queue Management Functions

```typescript
// Add message to queue
const addToQueue = useCallback((text: string, attachments: Attachment[]) => {
    const queuedMessage: QueuedMessage = {
        id: crypto.randomUUID(),
        text,
        attachments,
        createdAt: new Date().toISOString(),
    };
    setMessageQueue((prev) => [...prev, queuedMessage]);
    setQueuePaused(false); // Resume queue when adding
}, []);

// Remove message from queue
const removeFromQueue = useCallback((id: string) => {
    setMessageQueue((prev) => prev.filter((m) => m.id !== id));
}, []);

// Edit queued message text
const editQueuedMessage = useCallback((id: string, newText: string) => {
    setMessageQueue((prev) =>
        prev.map((m) => (m.id === id ? { ...m, text: newText } : m))
    );
}, []);

// Reorder queue (from drag-drop)
const reorderQueue = useCallback((reorderedMessages: QueuedMessage[]) => {
    setMessageQueue(reorderedMessages);
}, []);

// Clear entire queue
const clearQueue = useCallback(() => {
    setMessageQueue([]);
}, []);
```

## Modified Submit Handler

The `handleSubmit` function checks if loading and queues instead of sending:

```typescript
const handleSubmit = async ({ text, attachments }) => {
    if (!text.trim() && attachments.length === 0) return;

    // If loading, queue the message instead of sending
    if (isLoading) {
        addToQueue(text, attachments);
        return;
    }

    // ... normal send logic
};
```

## File Structure

```
src/features/chat/
├── index.ts                  # QueuedMessage type added
├── chat-view.tsx             # Queue state and processing logic
└── QueuedMessagesList.tsx    # Queue UI component (new)
```

## Dependencies

- `@dnd-kit/core` - Drag and drop context
- `@dnd-kit/sortable` - Sortable list functionality
- `@dnd-kit/utilities` - CSS transform utilities

## Edge Cases

### Agent Switching
- Agent selector is disabled during loading
- Queued messages use the current agent when processed
- Consider warning if user tries to switch with queued messages (not implemented)

### Session Switching
- Queue is local to the chat view component
- Switching tabs clears the queue (component unmounts)
- Queue is not persisted across sessions

### Empty Queue Items
- Messages with only attachments (no text) are allowed
- Displayed as "(images only)" in queue
- Still process correctly when sent
