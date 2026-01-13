import { useEffect, useRef, useCallback } from "react";

export interface Keybinding {
    id: string;
    keys: string[]; // e.g., ["cmd", "w"] or ["ctrl", "shift", "tab"]
    description: string;
    action: () => void;
    enabled?: boolean;
    preventDefault?: boolean;
}

interface KeybindingOptions {
    enabled?: boolean;
    preventDefault?: boolean;
}

// Helper to normalize key combinations
function normalizeKey(key: string): string {
    const keyMap: Record<string, string> = {
        "meta": "cmd",
        "command": "cmd",
        "control": "ctrl",
        "option": "alt",
        "escape": "esc",
        "return": "enter",
        "[": "bracketleft",
        "]": "bracketright",
        "arrowleft": "left",
        "arrowright": "right",
        "arrowup": "up",
        "arrowdown": "down",
    };
    return keyMap[key.toLowerCase()] || key.toLowerCase();
}

// Parse keyboard event into key combination
function parseKeyEvent(e: KeyboardEvent): string[] {
    const keys: string[] = [];
    
    // Add modifier keys in consistent order
    if (e.metaKey) keys.push("cmd");
    if (e.ctrlKey && !e.metaKey) keys.push("ctrl"); // Don't add ctrl if cmd is pressed (macOS)
    if (e.altKey) keys.push("alt");
    if (e.shiftKey) keys.push("shift");
    
    // Add the actual key pressed
    const key = normalizeKey(e.key);
    if (!["meta", "control", "alt", "shift"].includes(e.key.toLowerCase())) {
        keys.push(key);
    }
    
    return keys;
}

// Check if two key combinations match
function keysMatch(keys1: string[], keys2: string[]): boolean {
    if (keys1.length !== keys2.length) return false;
    return keys1.every((key, i) => key === keys2[i]);
}

export function useKeybinding(
    keys: string | string[],
    callback: () => void,
    options: KeybindingOptions = {}
) {
    const { enabled = true, preventDefault = true } = options;
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        if (!enabled) return;

        const normalizedKeys = typeof keys === "string" 
            ? keys.split("+").map(k => normalizeKey(k.trim()))
            : keys.map(k => normalizeKey(k));

        const handleKeyDown = (e: KeyboardEvent) => {
            const pressedKeys = parseKeyEvent(e);
            
            if (keysMatch(normalizedKeys, pressedKeys)) {
                if (preventDefault) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                callbackRef.current();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [keys, enabled, preventDefault]);
}

export function useKeybindings(keybindings: Keybinding[]) {
    const activeBindingsRef = useRef<Map<string, Keybinding>>(new Map());

    useEffect(() => {
        const activeBindings = activeBindingsRef.current;
        activeBindings.clear();

        // Store active bindings for potential conflicts
        keybindings.forEach(binding => {
            if (binding.enabled !== false) {
                const keyCombo = binding.keys.map(k => normalizeKey(k)).join("+");
                activeBindings.set(keyCombo, binding);
            }
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if typing in input/textarea (unless the shortcut has cmd/ctrl modifier)
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' ||
                            target.tagName === 'TEXTAREA' ||
                            target.contentEditable === 'true';

            const pressedKeys = parseKeyEvent(e);
            const keyCombo = pressedKeys.join("+");

            const binding = activeBindings.get(keyCombo);
            if (binding) {
                // Skip if typing and shortcut doesn't have cmd/ctrl modifier
                const hasModifier = pressedKeys.includes("cmd") || pressedKeys.includes("ctrl");
                if (isTyping && !hasModifier) {
                    return;
                }

                if (binding.preventDefault !== false) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                binding.action();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [keybindings]);
}

// Hook to get the current active element type (useful for disabling keybindings in inputs)
export function useIsInputFocused(): boolean {
    const checkIsInput = useCallback(() => {
        const activeElement = document.activeElement;
        if (!activeElement) return false;
        
        const tagName = activeElement.tagName.toLowerCase();
        return (
            tagName === "input" ||
            tagName === "textarea" ||
            tagName === "select" ||
            (activeElement as HTMLElement).contentEditable === "true"
        );
    }, []);

    // Check on mount and focus changes
    useEffect(() => {
        const handleFocus = () => checkIsInput();
        
        document.addEventListener("focusin", handleFocus);
        document.addEventListener("focusout", handleFocus);
        
        return () => {
            document.removeEventListener("focusin", handleFocus);
            document.removeEventListener("focusout", handleFocus);
        };
    }, [checkIsInput]);

    return checkIsInput();
}