// Default keyboard shortcuts configuration
// This will eventually be user-customizable through settings

export type ShortcutConfig = {
  id: string;
  defaultCombo: {
    key: string;
    ctrl?: boolean;
    cmd?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
  userCombo?: {
    key: string;
    ctrl?: boolean;
    cmd?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
};

// Global shortcuts that work everywhere
export const globalShortcuts: ShortcutConfig[] = [
  {
    id: 'global.new-tab',
    defaultCombo: { key: 't', cmd: true },
  },
  {
    id: 'global.close-tab',
    defaultCombo: { key: 'w', cmd: true },
  },
  {
    id: 'global.search',
    defaultCombo: { key: 'k', cmd: true },
  },
  {
    id: 'global.settings',
    defaultCombo: { key: ',', cmd: true },
  },
];

// Plugin-specific shortcuts
export const pluginShortcuts: Record<string, ShortcutConfig[]> = {
  notes: [
    {
      id: 'notes.create',
      defaultCombo: { key: 'n', cmd: true },
    },
    {
      id: 'notes.search',
      defaultCombo: { key: '/' },
    },
    {
      id: 'notes.delete',
      defaultCombo: { key: 'Backspace', cmd: true },
    },
  ],
  // Table shortcuts (within notes editor)
  tables: [
    // Navigation
    {
      id: 'tables.next-cell',
      defaultCombo: { key: 'Tab' },
    },
    {
      id: 'tables.prev-cell',
      defaultCombo: { key: 'Tab', shift: true },
    },
    // Column operations
    {
      id: 'tables.add-column-after',
      defaultCombo: { key: 'ArrowRight', cmd: true, shift: true },
    },
    {
      id: 'tables.add-column-before',
      defaultCombo: { key: 'ArrowLeft', cmd: true, shift: true },
    },
    {
      id: 'tables.delete-column',
      defaultCombo: { key: 'Backspace', cmd: true, alt: true },
    },
    // Row operations
    {
      id: 'tables.add-row',
      defaultCombo: { key: 'Enter' }, // In last column only
    },
    {
      id: 'tables.delete-row',
      defaultCombo: { key: 'Backspace', cmd: true, shift: true },
    },
    // Table operations
    {
      id: 'tables.delete-table',
      defaultCombo: { key: 'Backspace', cmd: true, shift: true, alt: true },
    },
  ],
  todos: [
    {
      id: 'todos.create',
      defaultCombo: { key: 'n', cmd: true },
    },
    {
      id: 'todos.complete',
      defaultCombo: { key: 'Enter', cmd: true },
    },
    {
      id: 'todos.delete',
      defaultCombo: { key: 'Backspace', cmd: true },
    },
  ],
  workflows: [
    {
      id: 'workflows.run',
      defaultCombo: { key: 'r', cmd: true },
    },
    {
      id: 'workflows.create',
      defaultCombo: { key: 'n', cmd: true },
    },
  ],
};

// Helper to get the active combo for a shortcut (user override or default)
export function getShortcutCombo(shortcutId: string): ShortcutConfig['defaultCombo'] | undefined {
  // Check global shortcuts
  const globalShortcut = globalShortcuts.find(s => s.id === shortcutId);
  if (globalShortcut) {
    return globalShortcut.userCombo || globalShortcut.defaultCombo;
  }
  
  // Check plugin shortcuts
  for (const pluginId in pluginShortcuts) {
    const shortcuts = pluginShortcuts[pluginId];
    if (shortcuts) {
      const shortcut = shortcuts.find(s => s.id === shortcutId);
      if (shortcut) {
        return shortcut.userCombo || shortcut.defaultCombo;
      }
    }
  }
  
  return undefined;
}

// Helper to save user customizations (will integrate with settings storage)
export function saveShortcutCustomization(shortcutId: string, combo: ShortcutConfig['defaultCombo']) {
  // TODO: Integrate with settings storage
  // For now, this is just a placeholder
  console.log('Saving shortcut customization:', shortcutId, combo);
  
  // In the future, this would:
  // 1. Save to localStorage or IndexedDB
  // 2. Sync with server if applicable
  // 3. Update the runtime configuration
}

// Helper to reset a shortcut to default
export function resetShortcut(shortcutId: string) {
  // TODO: Integrate with settings storage
  console.log('Resetting shortcut to default:', shortcutId);
}

// Helper to detect conflicts
export function detectConflicts(combo: NonNullable<ShortcutConfig['defaultCombo']>): string[] {
  const conflicts: string[] = [];
  
  // Check all shortcuts for conflicts
  const allShortcuts = [
    ...globalShortcuts,
    ...Object.values(pluginShortcuts).flat(),
  ];
  
  for (const shortcut of allShortcuts) {
    const activeCombo = shortcut.userCombo || shortcut.defaultCombo;
    if (
      activeCombo.key === combo.key &&
      activeCombo.ctrl === combo.ctrl &&
      activeCombo.cmd === combo.cmd &&
      activeCombo.shift === combo.shift &&
      activeCombo.alt === combo.alt
    ) {
      conflicts.push(shortcut.id);
    }
  }
  
  return conflicts;
}