import { useEffect, useRef, useState } from 'react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';

type KeyCombo = {
  key: string;
  ctrl?: boolean;
  cmd?: boolean;
  shift?: boolean;
  alt?: boolean;
};

type ShortcutHandler = (event: KeyboardEvent) => void | boolean | Promise<void | boolean>;

type ShortcutDefinition = {
  id: string;
  name: string;
  description?: string;
  combo: KeyCombo;
  handler: ShortcutHandler;
  // Control when this shortcut is active
  when?: () => boolean;
  // If true, prevents default browser behavior
  preventDefault?: boolean;
  // If true, stops event propagation
  stopPropagation?: boolean;
  // Priority for conflict resolution (higher wins)
  priority?: number;
  // Category for organization/settings
  category?: string;
};

type ShortcutContext = 'global' | 'workspace' | 'sidebar' | string;

class KeyboardShortcutManager {
  private shortcuts = new Map<ShortcutContext, ShortcutDefinition[]>();
  private activeContexts = new Set<ShortcutContext>(['global']);
  private listeners = new Map<string, Set<() => void>>();

  register(context: ShortcutContext, shortcuts: ShortcutDefinition[]) {
    this.shortcuts.set(context, shortcuts);
    this.notifyListeners(context);
  }

  unregister(context: ShortcutContext) {
    this.shortcuts.delete(context);
    this.notifyListeners(context);
  }

  setActiveContexts(contexts: ShortcutContext[]) {
    this.activeContexts = new Set(['global', ...contexts]);
  }

  private matches(combo: KeyCombo, event: KeyboardEvent): boolean {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    // Check key
    if (combo.key.toLowerCase() !== event.key.toLowerCase()) return false;
    
    // Check modifiers
    const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
    if (combo.cmd && !ctrlOrCmd) return false;
    if (combo.ctrl && !event.ctrlKey) return false;
    if (combo.shift && !event.shiftKey) return false;
    if (combo.alt && !event.altKey) return false;
    
    // Ensure no extra modifiers
    if (!combo.cmd && !combo.ctrl && ctrlOrCmd) return false;
    if (!combo.shift && event.shiftKey) return false;
    if (!combo.alt && event.altKey) return false;
    
    return true;
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    // Skip all shortcuts if a dialog is open (let the dialog handle its own keys)
    if (document.querySelector('[role="dialog"]')) {
      return false;
    }

    // Skip if typing in input/textarea (unless explicitly allowed)
    const target = event.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.contentEditable === 'true';

    // Collect all active shortcuts
    const activeShortcuts: ShortcutDefinition[] = [];
    
    for (const context of this.activeContexts) {
      const contextShortcuts = this.shortcuts.get(context) || [];
      activeShortcuts.push(...contextShortcuts);
    }

    // Sort by priority (higher first)
    activeShortcuts.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Find matching shortcuts
    for (const shortcut of activeShortcuts) {
      if (!this.matches(shortcut.combo, event)) continue;
      
      // Check 'when' condition
      if (shortcut.when && !shortcut.when()) continue;
      
      // Skip if typing and not explicitly allowed
      if (isTyping && !shortcut.combo.cmd && !shortcut.combo.ctrl) continue;
      
      // Handle the shortcut
      if (shortcut.preventDefault !== false) {
        event.preventDefault();
      }
      
      if (shortcut.stopPropagation) {
        event.stopPropagation();
      }
      
      const result = shortcut.handler(event);
      
      // If handler returns false, continue to next shortcut
      if (result === false) continue;
      
      return true; // Shortcut was handled
    }
    
    return false; // No shortcut handled
  }

  getActiveShortcuts(): ShortcutDefinition[] {
    const shortcuts: ShortcutDefinition[] = [];
    for (const context of this.activeContexts) {
      shortcuts.push(...(this.shortcuts.get(context) || []));
    }
    return shortcuts;
  }

  subscribe(context: ShortcutContext, callback: () => void) {
    if (!this.listeners.has(context)) {
      this.listeners.set(context, new Set());
    }
    this.listeners.get(context)!.add(callback);
    
    return () => {
      this.listeners.get(context)?.delete(callback);
    };
  }

  private notifyListeners(context: ShortcutContext) {
    this.listeners.get(context)?.forEach(callback => callback());
  }
}

// Global singleton instance
const manager = new KeyboardShortcutManager();

// Global keyboard handler
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => manager.handleKeyDown(e));
}

// Hook for components to register shortcuts
export function useKeyboardShortcuts(
  shortcuts: ShortcutDefinition[],
  options: {
    context?: ShortcutContext;
    // Only register if this component is in the main workspace (not sidebar)
    onlyWhenActive?: boolean;
    // Dependencies for the shortcuts
    deps?: unknown[];
  } = {}
) {
  const { activeTab, sidebarTabId } = useWorkspaceContext();
  const componentId = useRef(Math.random()).current;
  const context = options.context || `component-${componentId}`;
  
  useEffect(() => {
    // Check if we should register based on active state
    if (options.onlyWhenActive) {
      const isActive = activeTab?.id && activeTab.id !== sidebarTabId;
      if (!isActive) return;
    }

    manager.register(context, shortcuts);
    
    // Set active contexts based on current view
    if (activeTab?.pluginInstance) {
      const pluginContext = `plugin:${activeTab.pluginInstance.plugin.id}`;
      const viewContext = `view:${activeTab.pluginInstance.viewId}`;
      manager.setActiveContexts(['workspace', pluginContext, viewContext]);
    }
    
    return () => {
      manager.unregister(context);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, activeTab?.id, activeTab?.pluginInstance, sidebarTabId, options.onlyWhenActive, shortcuts, ...(options.deps || [])]);
}

// Hook to get current shortcuts (for display/settings)
export function useActiveShortcuts() {
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>([]);
  
  useEffect(() => {
    const update = () => setShortcuts(manager.getActiveShortcuts());
    update();
    
    // Subscribe to all contexts for updates
    const unsubscribers = [
      manager.subscribe('global', update),
      manager.subscribe('workspace', update),
    ];
    
    return () => unsubscribers.forEach(unsub => unsub());
  }, []);
  
  return shortcuts;
}

// Export types and manager for advanced use cases
export { manager as shortcutManager };
export type { ShortcutDefinition, KeyCombo, ShortcutContext };