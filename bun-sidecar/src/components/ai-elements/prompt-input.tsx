"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowUpIcon } from "lucide-react";
import {
    type ComponentProps,
    type FormEvent,
    createContext,
    useContext,
    useState,
    useCallback,
    forwardRef,
} from "react";

type PromptInputContextType = {
    isLoading: boolean;
    text: string;
    setText: (text: string) => void;
};

const PromptInputContext = createContext<PromptInputContextType | null>(null);

function usePromptInput() {
    const context = useContext(PromptInputContext);
    if (!context) {
        throw new Error("usePromptInput must be used within a PromptInput");
    }
    return context;
}

export type PromptInputProps = Omit<ComponentProps<"form">, "onSubmit"> & {
    onSubmit: (params: { text: string }) => void | Promise<void>;
    isLoading?: boolean;
};

export const PromptInput = ({
    className,
    onSubmit,
    isLoading = false,
    children,
    ...props
}: PromptInputProps) => {
    const [text, setText] = useState("");

    const handleSubmit = useCallback(
        async (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            if (!text.trim() || isLoading) return;

            await onSubmit({ text: text.trim() });
            setText("");
        },
        [text, isLoading, onSubmit]
    );

    return (
        <PromptInputContext.Provider value={{ isLoading, text, setText }}>
            <form
                className={cn(
                    "relative rounded-2xl border bg-background shadow-sm",
                    className
                )}
                onSubmit={handleSubmit}
                {...props}
            >
                {children}
            </form>
        </PromptInputContext.Provider>
    );
};

export type PromptInputTextareaProps = ComponentProps<typeof Textarea>;

export const PromptInputTextarea = forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
    ({ className, ...props }, ref) => {
        const { text, setText, isLoading } = usePromptInput();

        const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const form = e.currentTarget.closest("form");
                if (form) {
                    form.requestSubmit();
                }
            }
        };

        return (
            <Textarea
                ref={ref}
                className={cn(
                    "min-h-[44px] w-full resize-none border-0 bg-transparent px-4 py-3 text-sm shadow-none focus-visible:ring-0",
                    className
                )}
                disabled={isLoading}
                placeholder="Type a message..."
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                {...props}
            />
        );
    }
);

PromptInputTextarea.displayName = "PromptInputTextarea";

export type PromptInputFooterProps = ComponentProps<"div">;

export const PromptInputFooter = ({
    className,
    children,
    ...props
}: PromptInputFooterProps) => (
    <div
        className={cn(
            "flex items-center justify-between px-3 pb-3",
            className
        )}
        {...props}
    >
        {children}
    </div>
);

export type PromptInputSubmitProps = ComponentProps<typeof Button>;

export const PromptInputSubmit = ({
    className,
    disabled,
    children,
    ...props
}: PromptInputSubmitProps) => {
    const { isLoading, text } = usePromptInput();

    return (
        <Button
            className={cn("h-8 w-8 rounded-full p-0", className)}
            disabled={disabled || isLoading || !text.trim()}
            size="icon"
            type="submit"
            {...props}
        >
            {children ?? <ArrowUpIcon className="h-4 w-4" />}
        </Button>
    );
};
