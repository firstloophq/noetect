import { Command } from "lucide-react";

interface KeyboardIndicatorProps {
    keys: string[];
}

export function KeyboardIndicator({ keys }: KeyboardIndicatorProps) {
    const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    return (
        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
            {keys.map((key, index) => (
                <span key={index} className="inline-flex items-center">
                    {index > 0 && <span className="mx-0.5">+</span>}
                    {key === 'cmd' && isMac ? (
                        <Command className="w-3 h-3" />
                    ) : key === 'cmd' && !isMac ? (
                        <span>Ctrl</span>
                    ) : (
                        <span>{key}</span>
                    )}
                </span>
            ))}
        </span>
    );
}