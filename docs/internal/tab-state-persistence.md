# Tab State Persistence

This document explains how scroll position and cursor position are persisted when switching between tabs.

## Problem

When tabs unmount (due to removing `forceMount` from `TabsContent`), users lose their place:
1. Scroll position resets to top
2. Cursor position in ProseMirror editor resets to start

## Solution Overview

Two hooks manage state persistence using module-level Maps that survive component unmounts:
- `useTabScrollPersistence` - scroll position
- `useTabCursorPersistence` - ProseMirror cursor/selection

## Scroll Persistence

**File:** `src/hooks/useTabScrollPersistence.ts`

### Key Insight

Saving scroll position on cleanup (unmount) doesn't work because React/browser resets `scrollTop` to 0 before the cleanup function runs.

### Solution

Save scroll position on every `scroll` event, not just at cleanup:

```typescript
const handleScroll = () => {
    scrollPositions.set(tabId, element.scrollTop);
};
element.addEventListener("scroll", handleScroll);
```

### Restoration Timing

Content loads asynchronously, so the element may not be scrollable when the effect first runs. We use observers to wait for content:

```typescript
// Wait for element to become scrollable
const observer = new ResizeObserver(() => tryRestore());
observer.observe(element);

const mutationObserver = new MutationObserver(() => tryRestore());
mutationObserver.observe(element, { childList: true, subtree: true });
```

### Usage

```tsx
const scrollRef = useTabScrollPersistence(tabId);
return <div ref={scrollRef} className="overflow-y-auto">...</div>;
```

**Important:** The ref must be on a consistent element across all render states (loading, error, content). If you have early returns with different elements, wrap everything in a single container:

```tsx
// WRONG - ref on different elements in different branches
if (loading) return <div ref={scrollRef} />;
return <div ref={scrollRef}>content</div>;

// CORRECT - single wrapper element
return (
    <div ref={scrollRef} className="overflow-y-auto">
        {loading ? <Loading /> : <Content />}
    </div>
);
```

## Cursor Persistence

**File:** `src/hooks/useTabCursorPersistence.ts`

### How It Works

1. **Save** cursor position (anchor/head) on every selection change in `dispatchTransaction`
2. **Restore** after editor initialization via `requestAnimationFrame`

### Usage

```tsx
const { saveCursor, restoreCursor } = useTabCursorPersistence(tabId);

// In EditorView creation:
const view = new EditorView(editorRef.current, {
    state,
    dispatchTransaction(transaction) {
        // ... update state ...
        if (transaction.selectionSet) {
            saveCursor(view);
        }
    },
});

// After editor is ready:
requestAnimationFrame(() => {
    restoreCursor(view);
});
```

### Position Clamping

If the document content changed (e.g., external edit), saved positions are clamped to valid range:

```typescript
const maxPos = doc.content.size;
const anchor = Math.min(saved.anchor, maxPos);
const head = Math.min(saved.head, maxPos);
```

## Why forceMount Was Removed

Previously, `TabsContent` used `forceMount` to keep inactive tabs mounted (just hidden). This caused issues:

1. **Event listener leaks** - Global keyboard handlers (like Enter key in `NotesFileTree`) remained active even when viewing different tabs
2. **Unexpected navigation** - Enter key in a dialog could trigger note opening in a hidden tab

Removing `forceMount` means tabs properly unmount, cleaning up their event listeners. The persistence hooks compensate for the lost scroll/cursor state.

## Debugging

Both hooks include console logging prefixed with `[ScrollPersist]` and `[CursorPersist]`. Key things to check:

1. **Element found** - Is the ref attached? (`Element found: true`)
2. **Scroll events firing** - Are scroll positions being saved?
3. **Saved position** - What value is stored when switching away?
4. **Restoration** - Is the position being restored after content loads?

## Files Changed

- `src/hooks/useTabScrollPersistence.ts` - Scroll persistence hook
- `src/hooks/useTabCursorPersistence.ts` - Cursor persistence hook
- `src/features/notes/note-view.tsx` - Integration with notes editor
- `src/components/Workspace.tsx` - Removed `forceMount` from `TabsContent`
