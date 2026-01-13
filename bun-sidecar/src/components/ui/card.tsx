import * as React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

function Card({ className, style, ...props }: React.ComponentProps<"div">) {
  const { currentTheme } = useTheme();
  const { styles } = currentTheme;

  return (
    <div
      data-slot="card"
      className={cn("border", className)}
      style={{
        backgroundColor: styles.surfacePrimary,
        color: styles.contentPrimary,
        borderColor: styles.borderDefault,
        borderRadius: styles.borderRadius,
        boxShadow: styles.shadowSm,
        ...style,
      }}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

function CardTitle({ className, style, ...props }: React.ComponentProps<"div">) {
  const { currentTheme } = useTheme();
  const { styles } = currentTheme;

  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold tracking-tight", className)}
      style={{
        color: styles.contentPrimary,
        ...style,
      }}
      {...props}
    />
  );
}

function CardDescription({ className, style, ...props }: React.ComponentProps<"div">) {
  const { currentTheme } = useTheme();
  const { styles } = currentTheme;

  return (
    <div
      data-slot="card-description"
      className={cn("text-sm", className)}
      style={{
        color: styles.contentSecondary,
        ...style,
      }}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("p-6 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
