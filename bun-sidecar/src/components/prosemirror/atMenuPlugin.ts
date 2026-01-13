import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorState, Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export type AtMenuItem = {
    id: string;
    label: string;
    icon?: string;
    hint?: string;
    type?: string;
    children?: AtMenuItem[];
};

export type AtMenuConfig = {
    getSuggestions: (query: string) => AtMenuItem[];
    onSelect?: (view: EditorView, range: { from: number; to: number }, item: AtMenuItem) => void;
    maxItems?: number;
};

type AtMenuState = {
    active: boolean;
    from: number;
    to: number;
    query: string;
    selectedIndex: number;
    submenuOpen: boolean;
    selectedChildIndex: number;
};

const pluginKey = new PluginKey<AtMenuState>("atMenu");

function isGroup(item: AtMenuItem | undefined): item is AtMenuItem & { children: AtMenuItem[] } {
    return !!item && Array.isArray(item.children) && item.children.length > 0;
}

function findAtTrigger(state: EditorState): { from: number; to: number; query: string } | null {
    const sel = state.selection;
    if (!sel.empty) return null;
    const { $from } = sel;
    const blockStart = $from.start();
    const head = sel.from;

    const fromPos = Math.max(blockStart, head - 200);
    const textBefore = state.doc.textBetween(fromPos, head, "\n", "\n");
    const atIndex = textBefore.lastIndexOf("@");
    if (atIndex < 0) return null;

    if (atIndex > 0) {
        const prev = textBefore[atIndex - 1];
        if (prev && /[\w/\-]/.test(prev)) return null;
    }

    const query = textBefore.slice(atIndex + 1);
    // Close menu when space is typed (ends the mention)
    if (/\s/.test(query)) return null;

    const from = fromPos + atIndex;
    const to = head;
    return { from, to, query };
}

export function atMenuPlugin(config: AtMenuConfig) {
    const maxItems = config.maxItems ?? 10;

    return new Plugin<AtMenuState>({
        key: pluginKey,
        state: {
            init: () => ({ active: false, from: 0, to: 0, query: "", selectedIndex: 0, submenuOpen: false, selectedChildIndex: 0 }),
            apply(tr: Transaction, prev: AtMenuState, _old, newState: EditorState) {
                const meta = tr.getMeta(pluginKey) as
                    | { action?: string; selectedIndex?: number; submenuOpen?: boolean; selectedChildIndex?: number }
                    | undefined;

                if (meta?.action === "close") {
                    return { active: false, from: 0, to: 0, query: "", selectedIndex: 0, submenuOpen: false, selectedChildIndex: 0 };
                }

                const found = findAtTrigger(newState);
                if (!found) {
                    return { active: false, from: 0, to: 0, query: "", selectedIndex: 0, submenuOpen: false, selectedChildIndex: 0 };
                }

                // Query changed - reset selection
                const queryChanged = found.query !== prev.query;
                const selectedIndex = queryChanged
                    ? 0
                    : typeof meta?.selectedIndex === "number"
                    ? meta.selectedIndex
                    : prev.selectedIndex;
                const submenuOpen = queryChanged
                    ? false
                    : typeof meta?.submenuOpen === "boolean"
                    ? meta.submenuOpen
                    : prev.submenuOpen;
                const selectedChildIndex = queryChanged
                    ? 0
                    : typeof meta?.selectedChildIndex === "number"
                    ? meta.selectedChildIndex
                    : prev.selectedChildIndex;

                return {
                    active: true,
                    from: found.from,
                    to: found.to,
                    query: found.query,
                    selectedIndex,
                    submenuOpen,
                    selectedChildIndex,
                };
            },
        },

        props: {
            handleKeyDown(view, event) {
                const state = pluginKey.getState(view.state);
                if (!state || !state.active) return false;

                const suggestions = config.getSuggestions(state.query || "").slice(0, maxItems);
                const current = suggestions[state.selectedIndex];

                // Submenu navigation
                if (state.submenuOpen && isGroup(current)) {
                    const children = current.children;
                    if (event.key === "ArrowDown") {
                        event.preventDefault();
                        const next = (state.selectedChildIndex + 1) % Math.max(1, children.length);
                        view.dispatch(view.state.tr.setMeta(pluginKey, { selectedChildIndex: next }));
                        return true;
                    }
                    if (event.key === "ArrowUp") {
                        event.preventDefault();
                        const len = Math.max(1, children.length);
                        const next = (state.selectedChildIndex - 1 + len) % len;
                        view.dispatch(view.state.tr.setMeta(pluginKey, { selectedChildIndex: next }));
                        return true;
                    }
                    if (event.key === "ArrowLeft" || event.key === "Escape") {
                        event.preventDefault();
                        view.dispatch(view.state.tr.setMeta(pluginKey, { submenuOpen: false }));
                        return true;
                    }
                    if (event.key === "Enter" || event.key === "Tab") {
                        event.preventDefault();
                        const child = children[state.selectedChildIndex] || children[0];
                        if (child && config.onSelect) {
                            config.onSelect(view, { from: state.from, to: state.to }, child);
                        }
                        view.dispatch(view.state.tr.setMeta(pluginKey, { action: "close" }));
                        return true;
                    }
                }

                // Main list navigation
                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    const next = (state.selectedIndex + 1) % Math.max(1, suggestions.length);
                    view.dispatch(view.state.tr.setMeta(pluginKey, { selectedIndex: next, submenuOpen: false }));
                    return true;
                }
                if (event.key === "ArrowUp") {
                    event.preventDefault();
                    const len = Math.max(1, suggestions.length);
                    const next = (state.selectedIndex - 1 + len) % len;
                    view.dispatch(view.state.tr.setMeta(pluginKey, { selectedIndex: next, submenuOpen: false }));
                    return true;
                }
                if (event.key === "ArrowRight" && isGroup(current)) {
                    event.preventDefault();
                    view.dispatch(view.state.tr.setMeta(pluginKey, { submenuOpen: true, selectedChildIndex: 0 }));
                    return true;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                    if (suggestions.length === 0) return false;
                    event.preventDefault();
                    if (isGroup(current)) {
                        view.dispatch(view.state.tr.setMeta(pluginKey, { submenuOpen: true, selectedChildIndex: 0 }));
                        return true;
                    }
                    const item = current || suggestions[0];
                    if (item && config.onSelect) {
                        config.onSelect(view, { from: state.from, to: state.to }, item);
                    }
                    view.dispatch(view.state.tr.setMeta(pluginKey, { action: "close" }));
                    return true;
                }
                if (event.key === "Escape") {
                    event.preventDefault();
                    view.dispatch(view.state.tr.setMeta(pluginKey, { action: "close" }));
                    return true;
                }
                return false;
            },
        },

        view(editorView) {
            // Main container
            const dom = document.createElement("div");
            dom.className = "pm-at-menu";
            Object.assign(dom.style, {
                position: "fixed",
                zIndex: "9999",
                display: "none",
            });

            // Card container - simpler, no search input
            const card = document.createElement("div");
            card.className = "rounded-lg border bg-popover shadow-lg min-w-[280px] max-w-[380px] overflow-hidden";
            dom.appendChild(card);

            // Results list
            const list = document.createElement("div");
            list.className = "max-h-[280px] overflow-auto py-1";
            card.appendChild(list);

            // Submenu
            const submenuDom = document.createElement("div");
            submenuDom.className = "pm-at-submenu";
            Object.assign(submenuDom.style, {
                position: "fixed",
                zIndex: "10000",
                display: "none",
            });
            const submenuList = document.createElement("div");
            submenuList.className = "rounded-lg border bg-popover shadow-lg py-1 min-w-[240px] max-w-[340px] max-h-[280px] overflow-auto";
            submenuDom.appendChild(submenuList);

            document.body.appendChild(dom);
            document.body.appendChild(submenuDom);

            const render = () => {
                const state = pluginKey.getState(editorView.state);
                if (!state || !state.active) {
                    dom.style.display = "none";
                    submenuDom.style.display = "none";
                    return;
                }

                // Position above the '@'
                const coords = editorView.coordsAtPos(state.from);
                const margin = 8;
                dom.style.left = `${Math.min(window.innerWidth - 300, Math.max(8, coords.left))}px`;
                dom.style.bottom = `${window.innerHeight - coords.top + margin}px`;
                dom.style.top = "auto";
                dom.style.display = "block";

                const suggestions = config.getSuggestions(state.query || "").slice(0, maxItems);

                // Build results list
                list.innerHTML = "";

                if (suggestions.length === 0) {
                    const empty = document.createElement("div");
                    empty.className = "px-3 py-4 text-center text-sm text-muted-foreground";
                    empty.textContent = state.query ? `No results for "${state.query}"` : "No items available";
                    list.appendChild(empty);
                    submenuDom.style.display = "none";
                    return;
                }

                let selectedRowRect: DOMRect | null = null;
                const rows: HTMLElement[] = [];

                suggestions.forEach((item, idx) => {
                    if (!item || !item.label) return;

                    const row = document.createElement("button");
                    row.type = "button";
                    const isSelected = idx === state.selectedIndex;
                    const isGroupItem = isGroup(item);

                    row.className = `w-full text-left px-3 py-2 flex items-center gap-3 transition-colors rounded-md mx-1 ${
                        isSelected ? "bg-accent text-accent-foreground ring-1 ring-ring" : "hover:bg-accent/50"
                    }`;

                    // Determine icon color based on type
                    const isNote = item.id?.includes("notes") || item.type === "note";
                    const iconColor = isNote ? "bg-blue-500" : "bg-amber-500";

                    // Show hint/category if available
                    const hint = item.hint || "";

                    row.innerHTML = `
                        <span class="shrink-0 h-2 w-2 rounded-full ${iconColor}"></span>
                        <span class="flex-1 truncate text-sm">${item.label}</span>
                        ${hint ? `<span class="text-xs text-muted-foreground truncate max-w-[80px]">${hint}</span>` : ""}
                        ${isGroupItem ? '<span class="text-muted-foreground">→</span>' : ""}
                    `;

                    row.addEventListener("mouseenter", () => {
                        editorView.dispatch(editorView.state.tr.setMeta(pluginKey, { selectedIndex: idx }));
                    });

                    row.addEventListener("mousedown", (e) => {
                        e.preventDefault();
                        if (isGroupItem) {
                            editorView.dispatch(
                                editorView.state.tr.setMeta(pluginKey, { submenuOpen: true, selectedChildIndex: 0 })
                            );
                            return;
                        }
                        if (config.onSelect) {
                            config.onSelect(editorView, { from: state.from, to: state.to }, item);
                        }
                        editorView.dispatch(editorView.state.tr.setMeta(pluginKey, { action: "close" }));
                        setTimeout(() => editorView.focus(), 0);
                    });

                    list.appendChild(row);
                    rows.push(row);

                    if (isSelected) {
                        selectedRowRect = row.getBoundingClientRect();
                    }
                });

                // Scroll selected into view
                const selRow = rows[state.selectedIndex];
                if (selRow) selRow.scrollIntoView({ block: "nearest" });

                // Render submenu
                const current = suggestions[state.selectedIndex];
                if (state.submenuOpen && isGroup(current) && selectedRowRect) {
                    const children = current.children;
                    submenuList.innerHTML = "";
                    const childRows: HTMLElement[] = [];

                    children.forEach((child, cidx) => {
                        if (!child || !child.label) return;

                        const crow = document.createElement("button");
                        crow.type = "button";
                        const cSelected = cidx === state.selectedChildIndex;

                        crow.className = `w-full text-left px-3 py-2 flex items-center gap-3 transition-colors rounded-md mx-1 ${
                            cSelected ? "bg-accent text-accent-foreground ring-1 ring-ring" : "hover:bg-accent/50"
                        }`;

                        const isNote = child.id?.includes("notes") || child.type === "note";
                        const iconColor = isNote ? "bg-blue-500" : "bg-amber-500";

                        crow.innerHTML = `
                            <span class="shrink-0 h-2 w-2 rounded-full ${iconColor}"></span>
                            <span class="flex-1 truncate text-sm">${child.label}</span>
                        `;

                        crow.addEventListener("mouseenter", () => {
                            editorView.dispatch(editorView.state.tr.setMeta(pluginKey, { selectedChildIndex: cidx }));
                        });

                        crow.addEventListener("mousedown", (e) => {
                            e.preventDefault();
                            if (config.onSelect) {
                                config.onSelect(editorView, { from: state.from, to: state.to }, child);
                            }
                            editorView.dispatch(editorView.state.tr.setMeta(pluginKey, { action: "close" }));
                            setTimeout(() => editorView.focus(), 0);
                        });

                        submenuList.appendChild(crow);
                        childRows.push(crow);
                    });

                    const csel = childRows[state.selectedChildIndex];
                    if (csel) csel.scrollIntoView({ block: "nearest" });

                    const rect = selectedRowRect as DOMRect;
                    submenuDom.style.left = `${Math.min(window.innerWidth - 260, rect.right + 8)}px`;
                    submenuDom.style.bottom = `${window.innerHeight - rect.bottom}px`;
                    submenuDom.style.top = "auto";
                    submenuDom.style.display = "block";
                } else {
                    submenuDom.style.display = "none";
                }
            };

            const onWinChange = () => render();
            window.addEventListener("resize", onWinChange);
            window.addEventListener("scroll", onWinChange, true);

            return {
                update: render,
                destroy() {
                    window.removeEventListener("resize", onWinChange);
                    window.removeEventListener("scroll", onWinChange, true);
                    dom.remove();
                    submenuDom.remove();
                },
            };
        },
    });
}
