"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import type { ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";
import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("not-prose mb-2 w-full rounded-md border", className)}
    {...props}
  />
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart["type"];
  state: ToolUIPart["state"];
  className?: string;
};

const getStatusBadge = (status: ToolUIPart["state"]) => {
  const labels: Record<ToolUIPart["state"], string> = {
    "input-streaming": "Pending",
    "input-available": "Running",
    // @ts-expect-error state only available in AI SDK v6
    "approval-requested": "Awaiting",
    "approval-responded": "Responded",
    "output-available": "Completed",
    "output-error": "Error",
    "output-denied": "Denied",
  };

  const icons: Record<ToolUIPart["state"], ReactNode> = {
    "input-streaming": <CircleIcon className="size-3" />,
    "input-available": <ClockIcon className="size-3 animate-pulse" />,
    // @ts-expect-error state only available in AI SDK v6
    "approval-requested": <ClockIcon className="size-3" />,
    "approval-responded": <CheckCircleIcon className="size-3" />,
    "output-available": <CheckCircleIcon className="size-3" />,
    "output-error": <XCircleIcon className="size-3" />,
    "output-denied": <XCircleIcon className="size-3" />,
  };

  return (
    <Badge className="gap-1 rounded-full px-2 py-0.5 text-[10px] font-normal" variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  ...props
}: ToolHeaderProps) => {
  const { currentTheme } = useTheme();
  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center justify-between gap-2 px-3 py-2",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <WrenchIcon className="size-3.5" style={{ color: currentTheme.styles.contentSecondary }} />
        <span className="font-medium text-xs" style={{ color: currentTheme.styles.contentPrimary }}>
          {title ?? type.split("-").slice(1).join("-")}
        </span>
        {getStatusBadge(state)}
      </div>
      <ChevronDownIcon className="size-3.5 transition-transform group-data-[state=open]:rotate-180" style={{ color: currentTheme.styles.contentSecondary }} />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => {
  const { currentTheme } = useTheme();
  return (
    <div className={cn("space-y-1 overflow-hidden px-3 py-2", className)} {...props}>
      <h4
        className="font-medium text-[10px] uppercase tracking-wide"
        style={{ color: currentTheme.styles.contentSecondary }}
      >
        Parameters
      </h4>
      <div
        className="max-h-32 overflow-auto rounded"
        style={{ backgroundColor: currentTheme.styles.surfaceMuted }}
      >
        <div className="min-w-max">
          <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
        </div>
      </div>
    </div>
  );
};

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolUIPart["output"];
  errorText: ToolUIPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  const { currentTheme } = useTheme();

  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = (
      <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    );
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  const backgroundColor = errorText
    ? `${currentTheme.styles.semanticDestructive}1a` // ~10% opacity
    : currentTheme.styles.surfaceMuted;

  const textColor = errorText
    ? currentTheme.styles.semanticDestructive
    : currentTheme.styles.contentPrimary;

  return (
    <div className={cn("space-y-1 px-3 py-2", className)} {...props}>
      <h4
        className="font-medium text-[10px] uppercase tracking-wide"
        style={{ color: currentTheme.styles.contentSecondary }}
      >
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className="max-h-48 overflow-auto rounded text-xs [&_table]:w-full"
        style={{ backgroundColor, color: textColor }}
      >
        <div className="min-w-max">
          {errorText && <div className="p-2">{errorText}</div>}
          {Output}
        </div>
      </div>
    </div>
  );
};
