# Note External Change Detection

## Problem

When a note is open in a tab, it stays live in memory. If an external agent (or another process) modifies the note file on disk, the in-memory version becomes stale. Users expect to see the latest content when they switch back to a note tab.

## Solution

We use file modification time (`mtime`) to detect external changes when a tab becomes active.

## Architecture

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   note-view.tsx │────▶│  /api/notes/mtime │────▶│  FeatureStorage │
│  (tab becomes   │     │   (lightweight)   │     │  getFileMtime() │
│    active)      │◀────│                   │◀────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │
        ▼
   mtime changed?
        │
   ┌────┴────┐
   │         │
   ▼         ▼
 No       Yes
 edits    edits
   │         │
   ▼         ▼
Silent    Show toast
refresh   "Keep mine" / "Reload"
```

### Key Components

#### 1. Server-side: `FeatureStorage.getFileMtime()`

Location: `src/storage/FeatureStorage.ts`

```typescript
async getFileMtime(filename: string): Promise<number | null> {
    const filePath = path.join(this.basePath, filename);
    const file = Bun.file(filePath);
    const exists = await file.exists();
    if (!exists) {
        return null;
    }
    const stats = await file.stat();
    return stats.mtimeMs;
}
```

Uses `Bun.file().stat()` to get the file's modification time in milliseconds. Returns `null` if file doesn't exist.

#### 2. API Endpoint: `/api/notes/mtime`

Location: `src/server-routes/notes-routes.ts`

Lightweight endpoint that only returns the mtime, avoiding the cost of reading file content just to check freshness.

```typescript
"/api/notes/mtime": {
    async POST(req: Request) {
        const args = await req.json();
        const result = await functions.getNoteMtime.fx(args);
        return Response.json(result);
    },
}
```

#### 3. Client-side: `notesAPI.getNoteMtime()`

Location: `src/hooks/useNotesAPI.ts`

```typescript
getNoteMtime: (args: { fileName: string }) =>
    fetchAPI<{ mtime: number | null }>("mtime", args)
```

#### 4. Note Schema

Location: `src/features/notes/index.ts`

The `Note` type includes an optional `mtime` field:

```typescript
export const NoteSchema = z.object({
    fileName: z.string(),
    content: z.string(),
    frontMatter: z.record(z.string(), z.unknown()).optional(),
    folderPath: z.string().optional(),
    mtime: z.number().optional(), // File modification time in milliseconds
});
```

#### 5. Tab Activation Effect

Location: `src/features/notes/note-view.tsx`

The core detection logic runs when the tab **transitions** from inactive to active:

```typescript
// Refs for tracking
const lastKnownMtimeRef = useRef<number | null>(null);
const prevActiveTabIdRef = useRef<string | undefined>(undefined);

// On initial load, store the mtime
lastKnownMtimeRef.current = noteResult?.mtime ?? null;

// Check for external changes when tab becomes active (not on initial mount)
useEffect(() => {
    const wasActive = prevActiveTabIdRef.current === tabId;
    const isActive = activeTab?.id === tabId;
    prevActiveTabIdRef.current = activeTab?.id;

    // Only check when transitioning from inactive to active
    if (!isActive || wasActive) return;
    if (!noteFileName) return;
    // Skip if we don't have an mtime yet (initial load still in progress)
    if (lastKnownMtimeRef.current === null) return;

    const checkForExternalChanges = async () => {
        const { mtime: currentMtime } = await notesAPI.getNoteMtime({ fileName: noteFileName });
        const lastKnownMtime = lastKnownMtimeRef.current;

        // No change detected
        if (currentMtime === lastKnownMtime) return;
        if (currentMtime === null) return; // File was deleted

        const hasUnsavedEdits = currentEditorContent !== lastSavedContentRef.current;

        if (hasUnsavedEdits) {
            // Show conflict toast with "Reload" and "Keep mine" options
            toast("Note was modified externally", { ... });
        } else {
            // No unsaved edits - silently refresh
            // Fetch fresh content and update editor
        }
    };

    checkForExternalChanges();
    // Only depends on tab activation state, not content
}, [activeTab?.id, tabId, noteFileName]);
```

#### 6. Keeping mtime in Sync After Saves

Location: `src/features/notes/note-view.tsx`

When the user edits and auto-save kicks in, we must update `lastKnownMtimeRef` to avoid false "external change" detection:

```typescript
const debouncedSave = useCallback(async (contentToSave: string) => {
    // ... validation ...
    const savedNote = await notesAPI.saveNote({ fileName: noteFileName, content: contentToSave });
    lastSavedContentRef.current = contentToSave;
    // Update mtime to prevent false "external change" detection
    if (savedNote?.mtime) {
        lastKnownMtimeRef.current = savedNote.mtime;
    }
}, [notesAPI, noteFileName]);
```

The `saveNote` function in `fx.ts` returns the new mtime after writing:

```typescript
async function saveNote(args: { fileName: string; content: string }) {
    // ... write file ...
    const mtime = await getStorage().getFileMtime(args.fileName);
    return { fileName, content, frontMatter, mtime: mtime ?? undefined };
}
```

## Conflict Resolution

When external changes are detected AND the user has unsaved local edits:

1. **Toast notification** appears with message "Note was modified externally"
2. **"Reload" button**: Discards local changes, loads fresh content from disk
3. **"Keep mine" button**: Keeps local changes, updates `lastKnownMtimeRef` to suppress future warnings until the next external change

When external changes are detected AND there are NO unsaved local edits:
- Content is silently refreshed without user interaction

## Why mtime?

- **Stored automatically**: The filesystem maintains mtime on every write - no manual tracking needed
- **Lightweight check**: Fetching mtime is much cheaper than reading and comparing file content
- **Reliable**: Detects any change source (agents, external editors, CLI tools, etc.)

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| File deleted externally | Returns `null` mtime, check skipped |
| Tab inactive | No checks performed |
| Same mtime | No action taken |
| User saves while toast visible | `lastSavedContentRef` updates, next check may show no conflict |
| Initial mount | Skipped via `prevActiveTabIdRef` transition check |
| mtime not yet loaded | Skipped via `lastKnownMtimeRef === null` check |

## Common Pitfalls

### 1. False positives on every keystroke

**Problem**: The external change toast appears while typing.

**Cause**: Either:
- The effect's dependency array includes `content`, causing it to run on every keystroke
- `lastKnownMtimeRef` is not updated after auto-save, so the saved file's new mtime is seen as "external"

**Solution**:
- Only include `[activeTab?.id, tabId, noteFileName]` in the dependency array
- Update `lastKnownMtimeRef` in both `saveImmediately` and `debouncedSave` after successful saves

### 2. Check runs on initial mount

**Problem**: The check runs immediately when opening a note, potentially showing a stale toast.

**Cause**: The effect runs whenever `activeTab?.id === tabId`, including on mount.

**Solution**: Track the previous active tab ID and only run when transitioning from inactive to active:
```typescript
const wasActive = prevActiveTabIdRef.current === tabId;
const isActive = activeTab?.id === tabId;
prevActiveTabIdRef.current = activeTab?.id;
if (!isActive || wasActive) return;
```

### 3. saveNote doesn't return mtime

**Problem**: After saving, the client doesn't know the new mtime.

**Cause**: The server-side `saveNote` function wasn't returning the mtime.

**Solution**: Fetch mtime after writing and include it in the response:
```typescript
const mtime = await getStorage().getFileMtime(args.fileName);
return { ...note, mtime };
```

## Testing

To test manually:

1. Open a note in a tab
2. Switch to another tab (or minimize the app)
3. Edit the note file directly on disk (e.g., via terminal or another editor)
4. Switch back to the note tab
5. Observe:
   - If you had no local changes: content silently updates
   - If you had local changes: toast appears with options
