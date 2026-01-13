import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorState, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { Node as PMNode } from "prosemirror-model";

// Matches plugin://id URIs, e.g., todo://task-123
const URI_RE = /\b([a-zA-Z][a-zA-Z0-9_-]+):\/\/([^\s\]\)]+)\b/g;

function buildDecorations(doc: PMNode): DecorationSet {
  const decos: Decoration[] = [];

  doc.descendants((node, pos, parent) => {
    if (!node.isText) return true;
    // Skip inside code marks
    if (node.marks && node.marks.some((m) => m.type.name === "code")) return true;
    // Skip inside code_block nodes
    if (parent && parent.type.name === "code_block") return true;

    const text = node.text || "";
    let m: RegExpExecArray | null;
    URI_RE.lastIndex = 0;
    while ((m = URI_RE.exec(text))) {
      const full = m[0];
      const plugin = m[1];
      const id = m[2];
      const from = pos + m.index;
      const to = from + full.length;
      const deco = Decoration.inline(from, to, {
        class: "pm-resource-uri",
        title: `${plugin}://${id}`,
        "data-plugin": plugin,
        "data-id": id,
      });
      decos.push(deco);
    }
    return true;
  });

  return DecorationSet.create(doc, decos);
}

export const resourceDecorationsKey = new PluginKey<{ decos: DecorationSet }>("resource-decorations");

export function resourceDecorationsPlugin() {
  return new Plugin<{ decos: DecorationSet }>({
    key: resourceDecorationsKey,
    state: {
      init(_config, state: EditorState) {
        return { decos: buildDecorations(state.doc) };
      },
      apply(tr: Transaction, prev, _oldState, newState: EditorState) {
        if (tr.docChanged) {
          return { decos: buildDecorations(newState.doc) };
        }
        return prev;
      },
    },
    props: {
      decorations(state) {
        const pluginState = resourceDecorationsKey.getState(state);
        return pluginState?.decos || null;
      },
    },
  });
}
