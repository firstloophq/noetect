import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
};

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  style,
  ...props
}: ButtonProps) {
  const { currentTheme } = useTheme();
  const { styles } = currentTheme;
  const Comp = asChild ? Slot : "button";

  const baseClasses = "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus:outline focus:outline-2 focus:outline-offset-2";

  const sizeClasses: Record<ButtonSize, string> = {
    default: "h-9 px-4 py-2 has-[>svg]:px-3",
    sm: "h-8 px-3 has-[>svg]:px-2.5",
    lg: "h-10 px-6 has-[>svg]:px-4",
    icon: "size-9",
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    default: {
      backgroundColor: styles.semanticPrimary,
      color: styles.semanticPrimaryForeground,
      boxShadow: styles.shadowSm,
    },
    destructive: {
      backgroundColor: styles.semanticDestructive,
      color: styles.semanticDestructiveForeground,
      boxShadow: styles.shadowSm,
    },
    outline: {
      backgroundColor: "transparent",
      color: styles.contentPrimary,
      borderColor: styles.borderDefault,
      borderWidth: "1px",
      borderStyle: "solid",
    },
    secondary: {
      backgroundColor: styles.surfaceSecondary,
      color: styles.contentPrimary,
      boxShadow: styles.shadowSm,
    },
    ghost: {
      backgroundColor: "transparent",
      color: styles.contentPrimary,
    },
    link: {
      backgroundColor: "transparent",
      color: styles.contentAccent,
      textDecoration: "underline",
      textUnderlineOffset: "4px",
    },
  };

  return (
    <Comp
      data-slot="button"
      className={cn(baseClasses, sizeClasses[size], className)}
      style={{
        ...variantStyles[variant],
        borderRadius: styles.borderRadius,
        // @ts-expect-error CSS custom property for focus outline color
        "--focus-outline-color": styles.contentPrimary,
        outlineColor: "var(--focus-outline-color)",
        ...style,
      }}
      {...props}
    />
  );
}

// Backward compatibility helper for components that used buttonVariants from CVA
function buttonVariants(options?: { variant?: ButtonVariant; size?: ButtonSize }) {
  const { size = "default" } = options ?? {};

  const sizeClasses: Record<ButtonSize, string> = {
    default: "h-9 px-4 py-2 has-[>svg]:px-3",
    sm: "h-8 px-3 has-[>svg]:px-2.5",
    lg: "h-10 px-6 has-[>svg]:px-4",
    icon: "size-9",
  };

  // Return just the size classes for external use
  // The variant styling is handled by inline styles now
  return `inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus:outline focus:outline-2 focus:outline-offset-2 ${sizeClasses[size]}`;
}

export { Button, buttonVariants };
