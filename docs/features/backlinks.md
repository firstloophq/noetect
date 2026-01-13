# Backlinks Feature

Roam/Obsidian-style backlinks for the notes feature. When viewing a note, see all other notes that link to it via `[[wiki links]]`.

## Overview

The backlinks system maintains an index of all wiki-link relationships between notes. This enables:

- **Backlinks**: See which notes link TO the current note
- **Phantom Links**: Discover links to notes that don't exist yet (and create them with one click)

## How It Works

### Wiki Link Syntax

Use double brackets to create wiki links in your notes:

```markdown
This relates to [[Project Alpha]] and [[Meeting Notes]].
```

### Index Structure

The index is stored at `{workspace}/.noetic/backlinks.json` and contains:

```typescript
interface BacklinksIndex {
    version: 1;
    lastFullScan: string;           // ISO timestamp
    backlinks: Record<string, StringSet>;    // target → sources linking to it
    outboundLinks: Record<string, StringSet>; // source → targets it links to
    phantoms: Record<string, StringSet>;      // non-existent targets → referencing files
    mtimes: Record<string, number>;           // file modification times
}
```

**StringSet**: Uses `Record<string, true>` instead of arrays for O(1) add/remove/lookup operations.

### Update Triggers

| Event | Action |
|-------|--------|
| App startup | Load index, refresh stale files via mtime comparison |
| Note save | Re-extract links from saved file, update index |
| Note delete | Remove from index, add to phantoms if anything links to it |
| Note rename | Update all index references |
| Note create | Remove from phantoms if it was a phantom link |

## Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Query backlinks | O(1) | Hash map lookup |
| Update on save | O(L + M) | L = links in file, M = content size |
| Remove file | O(L) | L = outbound links in file |
| Query phantoms | O(1) | Pre-computed set |
| Startup refresh | O(N + K × M) | K = modified files since last run |

## UI Components

### Sidebar Panel

The note editor sidebar shows:

1. **On This Page** (collapsible) - Table of contents from headings
2. **Backlinks** (collapsible) - Notes that link to the current note
3. **Phantom Links** (collapsible, if any) - Links to non-existent notes

### Phantom Link Behavior

Clicking a phantom link:
1. Creates a new note with the phantom name
2. Adds a `# Title` heading
3. Opens the new note in a tab
4. Removes it from the phantoms index

## API Endpoints

### Get Backlinks

```
POST /api/notes/backlinks/get
Body: { "fileName": "my-note.md" }
Response: {
    "backlinks": [
        { "sourceFile": "project.md", "displayName": "project" }
    ],
    "phantomLinks": [
        { "targetName": "Future Feature", "referencedIn": ["project.md"] }
    ]
}
```

### Get All Phantom Links

```
POST /api/notes/backlinks/phantoms
Response: [
    { "targetName": "Unwritten Note", "referencedIn": ["note1.md", "note2.md"] }
]
```

### Rebuild Index

```
POST /api/notes/backlinks/rebuild
Response: { "fileCount": 42 }
```

## File Structure

```
src/features/notes/
├── backlinks-types.ts      # Type definitions and StringSet helpers
├── backlinks-service.ts    # Index management (scan, update, query)
└── BacklinksPanel.tsx      # UI component with collapsible sections

src/server-routes/
└── notes-routes.ts         # API endpoints + lifecycle hooks

src/hooks/
└── useNotesAPI.ts          # Client-side API methods
```

## Link Extraction

Wiki links are extracted using regex:

```typescript
const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;
```

Links are:
- Trimmed of whitespace
- Deduplicated per file
- Stored without `.md` extension in the index

## Storage Location

- Index file: `{workspace}/.noetic/backlinks.json`
- Created automatically on first startup
- Survives app restarts (persisted to disk)
- ~100-200KB for 1000 notes with 10 links each
