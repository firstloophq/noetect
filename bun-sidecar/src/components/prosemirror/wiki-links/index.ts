// Schema
export { wikiLinkNodeSpec, wikiLinkMarkSpec } from "./schema";

// Plugin
export {
    createWikiLinkPlugin,
    wikiLinkPluginKey,
    insertWikiLink,
    closeWikiLinkPopup,
    getWikiLinkPopupPosition,
} from "./plugin";
export type { WikiLinkPluginState, WikiLinkPluginOptions } from "./plugin";

// React Component
export { WikiLinkPopup } from "./WikiLinkPopup";
