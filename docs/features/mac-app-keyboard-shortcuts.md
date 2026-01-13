# Mac App Keyboard Shortcuts

This document explains how keyboard shortcuts work in the bundled Mac app and how to add new ones.

## The Problem

When the app runs as a native Mac app (via the Swift wrapper in `mac-app/`), WKWebView intercepts keyboard events before they reach the JavaScript layer. This means shortcuts like `Cmd+Enter` and even basic `Tab` navigation don't work out of the box.

## The Solution

We use a global bridge between Swift and React:

1. **Swift**: Intercepts keyboard events via `NSEvent.addLocalMonitorForEvents`
2. **React**: Registers global handler functions on `window` via `useNativeKeyboardBridge`
3. **Communication**: Swift calls the global functions directly via `evaluateJavaScript`

### 1. Swift: Local Event Monitor

In `mac-app/macos-host/Sources/AppDelegate.swift`, we intercept keyboard events at the application level:

```swift
self.localEventMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
    // Cmd+Enter for chat submission
    if event.modifierFlags.contains(.command) && event.keyCode == 36 {
        self?.dispatchKeyToWebView(key: "Enter", code: "Enter", metaKey: true)
        return nil
    }

    // Tab for focus navigation
    if event.keyCode == 48 {
        let shiftKey = event.modifierFlags.contains(.shift)
        self?.dispatchKeyToWebView(key: "Tab", code: "Tab", shiftKey: shiftKey)
        return nil
    }

    return event
}
```

The `dispatchKeyToWebView` function calls global JavaScript handlers:

```swift
private func dispatchKeyToWebView(key: String, code: String, ...) {
    // Cmd+Enter uses custom event for component-specific handling
    if key == "Enter" && metaKey {
        let script = "window.dispatchEvent(new CustomEvent('nativeSubmit'));"
        webView.evaluateJavaScript(script) { _, _ in }
        return
    }

    // Tab uses global focus navigation
    if key == "Tab" {
        let script = shiftKey
            ? "window.__nativeFocusPrevious && window.__nativeFocusPrevious();"
            : "window.__nativeFocusNext && window.__nativeFocusNext();"
        webView.evaluateJavaScript(script) { _, _ in }
        return
    }
}
```

### 2. React: Global Keyboard Bridge

In `src/hooks/useNativeKeyboardBridge.ts`, we register global functions that Swift can call:

```tsx
// Called once at app root via App.tsx
export function useNativeKeyboardBridge() {
    useEffect(() => {
        // Focus navigation for Tab key
        window.__nativeFocusNext = () => {
            const focusable = getFocusableElements();
            const currentIndex = focusable.indexOf(document.activeElement);
            const nextIndex = (currentIndex + 1) % focusable.length;
            focusable[nextIndex]?.focus();
        };

        window.__nativeFocusPrevious = () => { /* similar, but backwards */ };

        return () => { /* cleanup */ };
    }, []);
}
```

### 3. Component-Specific Handlers

For shortcuts that need component-specific logic (like Cmd+Enter for chat), components listen for custom events:

```tsx
// In ProseMirrorChatInput.tsx
useEffect(() => {
    const handleNativeSubmit = () => {
        // Only respond if this editor has focus
        if (editorElement.contains(document.activeElement)) {
            triggerSubmit();
        }
    };
    window.addEventListener("nativeSubmit", handleNativeSubmit);
    return () => window.removeEventListener("nativeSubmit", handleNativeSubmit);
}, []);
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Swift (AppDelegate.swift)                                  │
│  - NSEvent.addLocalMonitorForEvents intercepts keys         │
│  - Calls dispatchKeyToWebView() for handled keys            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ evaluateJavaScript
┌─────────────────────────────────────────────────────────────┐
│  Global Handlers (useNativeKeyboardBridge.ts)               │
│  - window.__nativeFocusNext() - Tab navigation              │
│  - window.__nativeFocusPrevious() - Shift+Tab navigation    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ CustomEvent
┌─────────────────────────────────────────────────────────────┐
│  Component Handlers (e.g., ProseMirrorChatInput.tsx)        │
│  - Listen for 'nativeSubmit' event                          │
│  - Check focus before acting                                │
└─────────────────────────────────────────────────────────────┘
```

## Adding New Shortcuts

### Option A: Global handler (for app-wide behavior like Tab)

1. **Swift** (`AppDelegate.swift`): Add to local event monitor and call `dispatchKeyToWebView`
2. **React** (`useNativeKeyboardBridge.ts`): Add a new `window.__myHandler` function

### Option B: Component-specific handler (for context-dependent behavior like Cmd+Enter)

1. **Swift** (`AppDelegate.swift`): Add to local event monitor, dispatch CustomEvent
2. **React** (your component): Listen for the event and check focus before acting

## Key Codes Reference

Common macOS key codes:
- `36` = Return/Enter
- `48` = Tab
- `49` = Space
- `51` = Delete (Backspace)
- `53` = Escape

## Existing Shortcuts

| Shortcut | Handler Type | Location |
|----------|-------------|----------|
| Cmd+Enter | CustomEvent `nativeSubmit` | `ProseMirrorChatInput.tsx`, todo dialogs |
| Tab | Global `__nativeFocusNext` | `useNativeKeyboardBridge.ts` |
| Shift+Tab | Global `__nativeFocusPrevious` | `useNativeKeyboardBridge.ts` |
| Ctrl+Tab | Global `__nativeNextTab` | `useNativeKeyboardBridge.ts` (triggers keybinding) |
| Ctrl+Shift+Tab | Global `__nativePrevTab` | `useNativeKeyboardBridge.ts` (triggers keybinding) |
| Cmd+K | KeyboardEvent dispatch | `WebViewWindowController.swift` |

## Note on Browser vs Mac App

- **Browser**: Native keyboard events work directly
- **Mac App**: Events are intercepted by Swift and forwarded via global functions or CustomEvents
