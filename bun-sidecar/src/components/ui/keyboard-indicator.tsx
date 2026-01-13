import { cn } from "@/lib/utils";

interface KeyboardIndicatorProps {
    keys: string | string[];
    className?: string;
}

export function KeyboardIndicator({ keys, className }: KeyboardIndicatorProps) {
    const keyArray = typeof keys === "string" ? keys.split("+").map(k => k.trim()) : keys;
    
    const formatKey = (key: string): string => {
        const keyMap: Record<string, string> = {
            "cmd": "⌘",
            "meta": "⌘",
            "ctrl": "⌃",
            "control": "⌃",
            "alt": "⌥",
            "option": "⌥",
            "shift": "⇧",
            "enter": "↵",
            "return": "↵",
            "escape": "⎋",
            "esc": "⎋",
            "tab": "⇥",
            "delete": "⌫",
            "backspace": "⌫",
            "up": "↑",
            "down": "↓",
            "left": "←",
            "right": "→",
            "bracketleft": "[",
            "bracketright": "]",
            "comma": ",",
        };
        
        const formatted = keyMap[key.toLowerCase()] || key.toUpperCase();
        return formatted;
    };
    
    return (
        <div className={cn("inline-flex items-center gap-1", className)}>
            {keyArray.map((key, index) => (
                <kbd
                    key={index}
                    className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground"
                >
                    {formatKey(key)}
                </kbd>
            ))}
        </div>
    );
}