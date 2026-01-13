import { useState, useRef, useEffect, useCallback } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema, defaultMarkdownSerializer } from "prosemirror-markdown";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { history, undo, redo } from "prosemirror-history";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/hooks/useTheme";
import "prosemirror-view/style/prosemirror.css";
import "./cursor-styles.css";

/**
 * Test page for experimenting with ProseMirror editor
 * Simplified version without CRDT to verify basic functionality
 */

export function TestEditorPage() {
    const { currentTheme } = useTheme();
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    const [aiEditText, setAiEditText] = useState("Hello from AI!");
    const [insertPosition, setInsertPosition] = useState<"start" | "end" | "cursor">("end");
    const [markdown, setMarkdown] = useState<string>("");

    // Update markdown display
    const updateMarkdown = useCallback(() => {
        if (viewRef.current) {
            const md = defaultMarkdownSerializer.serialize(viewRef.current.state.doc);
            setMarkdown(md);
        }
    }, []);

    // Initialize editor
    useEffect(() => {
        const container = editorRef.current;
        if (!container) return;

        console.log("[Editor] Initializing ProseMirror...");

        // Clear any existing content (handles React strict mode)
        container.innerHTML = "";

        // Create editor state with essential plugins
        const state = EditorState.create({
            schema,
            plugins: [
                history(),
                keymap({
                    "Mod-z": undo,
                    "Mod-y": redo,
                    "Mod-Shift-z": redo,
                }),
                keymap(baseKeymap),
            ],
        });

        // Create editor view
        const view = new EditorView(container, {
            state,
        });

        viewRef.current = view;
        console.log("[Editor] EditorView created successfully");

        // Focus the editor
        view.focus();

        return () => {
            console.log("[Editor] Destroying EditorView...");
            view.destroy();
            viewRef.current = null;
        };
    }, []);

    // Simulate AI edit - insert text
    const simulateAiInsert = useCallback(() => {
        if (!viewRef.current) return;

        const view = viewRef.current;
        const { state } = view;
        let pos: number;

        switch (insertPosition) {
            case "start":
                pos = 1;
                break;
            case "cursor":
                pos = state.selection.from;
                break;
            case "end":
            default:
                pos = state.doc.content.size - 1;
                break;
        }

        const tr = state.tr.insertText(aiEditText, pos);
        view.dispatch(tr);
        updateMarkdown();
    }, [aiEditText, insertPosition, updateMarkdown]);

    // Simulate AI edit - insert a paragraph
    const simulateAiParagraph = useCallback(() => {
        if (!viewRef.current) return;

        const view = viewRef.current;
        const { state } = view;

        const paragraph = schema.nodes.paragraph.create(
            null,
            schema.text(aiEditText)
        );

        const pos = state.doc.content.size - 1;
        const tr = state.tr.insert(pos, paragraph);
        view.dispatch(tr);
        updateMarkdown();
    }, [aiEditText, updateMarkdown]);

    // Simulate AI edit - wrap selection in bold
    const simulateAiBold = useCallback(() => {
        if (!viewRef.current) return;

        const view = viewRef.current;
        const { state } = view;
        const { from, to } = state.selection;

        if (from === to) {
            console.log("No selection to bold");
            return;
        }

        const markType = schema.marks.strong;
        const tr = state.tr.addMark(from, to, markType.create());
        view.dispatch(tr);
        updateMarkdown();
    }, [updateMarkdown]);

    // Simulate AI replacing selected text
    const simulateAiReplace = useCallback(() => {
        if (!viewRef.current) return;

        const view = viewRef.current;
        const { state } = view;
        const { from, to } = state.selection;

        if (from === to) {
            console.log("No selection to replace");
            return;
        }

        const tr = state.tr.replaceWith(from, to, schema.text(aiEditText));
        view.dispatch(tr);
        updateMarkdown();
    }, [aiEditText, updateMarkdown]);

    // Simulate streaming AI edit
    const simulateStreamingEdit = useCallback(() => {
        if (!viewRef.current) return;

        const view = viewRef.current;
        const text = aiEditText;
        let index = 0;

        const basePos = view.state.doc.content.size - 1;

        const insertNextChar = () => {
            if (index >= text.length || !viewRef.current) return;

            const currentView = viewRef.current;
            const pos = currentView.state.doc.content.size - 1;
            const tr = currentView.state.tr.insertText(text[index] ?? "", pos);
            currentView.dispatch(tr);
            index++;

            setTimeout(insertNextChar, 50);
        };

        const initialTr = view.state.tr.insertText("\n\n**AI is typing:** ", basePos);
        view.dispatch(initialTr);

        setTimeout(insertNextChar, 100);
    }, [aiEditText]);

    return (
        <div className="h-full flex" style={{ backgroundColor: currentTheme.styles.surfacePrimary }}>
            {/* Editor Panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div
                    className="p-4 border-b"
                    style={{ borderColor: currentTheme.styles.borderDefault }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h1
                                className="text-2xl font-bold"
                                style={{ color: currentTheme.styles.contentPrimary }}
                            >
                                ProseMirror Test Editor
                            </h1>
                            <p
                                className="text-sm mt-1"
                                style={{ color: currentTheme.styles.contentSecondary }}
                            >
                                Basic editor without CRDT (testing mode)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    <div
                        ref={editorRef}
                        className="min-h-[400px] p-4 border rounded-lg"
                        style={{
                            backgroundColor: currentTheme.styles.surfaceSecondary,
                            borderColor: currentTheme.styles.borderDefault,
                            color: currentTheme.styles.contentPrimary,
                        }}
                    />
                </div>
            </div>

            {/* AI Control Panel */}
            <div
                className="w-80 border-l flex flex-col"
                style={{ borderColor: currentTheme.styles.borderDefault }}
            >
                <div
                    className="p-4 border-b"
                    style={{ borderColor: currentTheme.styles.borderDefault }}
                >
                    <h2
                        className="text-lg font-semibold"
                        style={{ color: currentTheme.styles.contentPrimary }}
                    >
                        AI Edit Controls
                    </h2>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {/* Text input */}
                    <div>
                        <label
                            className="text-sm font-medium block mb-2"
                            style={{ color: currentTheme.styles.contentSecondary }}
                        >
                            Text to insert
                        </label>
                        <Textarea
                            value={aiEditText}
                            onChange={(e) => setAiEditText(e.target.value)}
                            placeholder="Enter text for AI to insert..."
                            className="min-h-[80px]"
                        />
                    </div>

                    {/* Position selector */}
                    <div>
                        <label
                            className="text-sm font-medium block mb-2"
                            style={{ color: currentTheme.styles.contentSecondary }}
                        >
                            Insert position
                        </label>
                        <div className="flex gap-2">
                            {(["start", "cursor", "end"] as const).map((pos) => (
                                <Button
                                    key={pos}
                                    variant={insertPosition === pos ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setInsertPosition(pos)}
                                >
                                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2">
                        <label
                            className="text-sm font-medium block"
                            style={{ color: currentTheme.styles.contentSecondary }}
                        >
                            AI Actions
                        </label>

                        <Button
                            onClick={simulateAiInsert}
                            className="w-full"
                            variant="outline"
                        >
                            Insert Text
                        </Button>

                        <Button
                            onClick={simulateAiParagraph}
                            className="w-full"
                            variant="outline"
                        >
                            Add Paragraph
                        </Button>

                        <Button
                            onClick={simulateAiBold}
                            className="w-full"
                            variant="outline"
                        >
                            Bold Selection
                        </Button>

                        <Button
                            onClick={simulateAiReplace}
                            className="w-full"
                            variant="outline"
                        >
                            Replace Selection
                        </Button>

                        <Button
                            onClick={simulateStreamingEdit}
                            className="w-full"
                        >
                            Streaming Edit (Simulated)
                        </Button>
                    </div>

                    {/* Current markdown preview */}
                    <div
                        className="border-t pt-4"
                        style={{ borderColor: currentTheme.styles.borderDefault }}
                    >
                        <label
                            className="text-sm font-medium block mb-2"
                            style={{ color: currentTheme.styles.contentSecondary }}
                        >
                            Current Markdown
                        </label>
                        <pre
                            className="text-xs p-2 rounded overflow-auto max-h-48 font-mono"
                            style={{
                                backgroundColor: currentTheme.styles.surfaceSecondary,
                                color: currentTheme.styles.contentTertiary,
                            }}
                        >
                            {markdown || "(empty)"}
                        </pre>
                        <Button
                            onClick={updateMarkdown}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                        >
                            Refresh Markdown
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TestEditorPage;
