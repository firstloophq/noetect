import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

/**
 * Inline MCP server that provides the render_ui tool.
 * This allows skills to render custom HTML UI back to the user.
 *
 * The tool output is detected by the frontend and rendered in a sandboxed iframe
 * instead of being displayed as JSON.
 */
export const uiRendererServer = createSdkMcpServer({
    name: "noetect-ui",
    version: "1.0.0",
    tools: [
        tool(
            "render_ui",
            `Render custom HTML UI to display interactive content to the user. Use this when you need to show rich UI elements like forms, charts, tables, or interactive widgets. The HTML will be rendered in a sandboxed iframe.

THEME INTEGRATION: The iframe automatically includes CSS variables matching the app's current theme. Use these in your styles:

Surface colors (backgrounds):
  var(--surface-primary), var(--surface-secondary), var(--surface-tertiary), var(--surface-accent), var(--surface-muted)

Content colors (text):
  var(--content-primary), var(--content-secondary), var(--content-tertiary), var(--content-accent)

Border colors:
  var(--border-default), var(--border-accent)

Semantic colors:
  var(--semantic-primary), var(--semantic-primary-foreground)
  var(--semantic-destructive), var(--semantic-destructive-foreground)
  var(--semantic-success), var(--semantic-success-foreground)

Design tokens:
  var(--border-radius), var(--shadow-sm), var(--shadow-md), var(--shadow-lg)

Built-in utility classes: .card, .text-primary, .text-secondary, .text-muted, .text-accent, .text-success, .text-destructive, .bg-primary, .bg-secondary, .bg-muted

Button variants: button (default), button.primary, button.destructive

Default styles are already applied to body, button, input, select, textarea, table, code, and pre elements.`,
            {
                html: z.string().describe("HTML content to render. Use the theme CSS variables (e.g., var(--surface-secondary)) for consistent styling. Do NOT include full HTML document structure - just the body content."),
                title: z.string().optional().describe("Title displayed above the UI panel"),
                height: z.number().optional().describe("Height of the UI panel in pixels (default: auto-resize to content)"),
            },
            async (args) => {
                // The tool just passes through the HTML - the frontend handles rendering
                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify({
                            __noetect_ui: true,
                            html: args.html,
                            title: args.title,
                            height: args.height,
                        })
                    }]
                };
            }
        )
    ]
});

// Tool name as it will appear in the SDK
export const RENDER_UI_TOOL_NAME = "mcp__noetect-ui__render_ui";
