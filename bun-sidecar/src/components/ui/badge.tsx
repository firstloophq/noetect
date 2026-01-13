import * as React from "react";
import { useTheme } from "@/hooks/useTheme";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success";
};

function Badge({ className, variant = "default", style, ...props }: BadgeProps) {
    const { currentTheme } = useTheme();
    const { styles } = currentTheme;

    const variantStyles: Record<string, React.CSSProperties> = {
        default: {
            backgroundColor: styles.semanticPrimary,
            color: styles.semanticPrimaryForeground,
            borderColor: "transparent",
        },
        secondary: {
            backgroundColor: styles.surfaceSecondary,
            color: styles.contentPrimary,
            borderColor: styles.borderDefault,
        },
        destructive: {
            backgroundColor: styles.semanticDestructive,
            color: styles.semanticDestructiveForeground,
            borderColor: "transparent",
        },
        outline: {
            backgroundColor: "transparent",
            color: styles.contentPrimary,
            borderColor: styles.borderDefault,
        },
        success: {
            backgroundColor: styles.semanticSuccess,
            color: styles.semanticSuccessForeground,
            borderColor: "transparent",
        },
    };

    const base = "inline-flex h-5 items-center border px-2 text-xs font-medium leading-none";
    const combined = className ? `${base} ${className}` : base;

    return (
        <span
            data-slot="badge"
            className={combined}
            style={{
                ...variantStyles[variant],
                borderRadius: styles.borderRadius,
                ...style,
            }}
            {...props}
        />
    );
}

export { Badge };
