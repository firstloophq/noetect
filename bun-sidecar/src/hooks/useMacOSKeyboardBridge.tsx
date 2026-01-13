import { useEffect } from 'react';
import { shortcutManager } from './useKeyboardShortcuts';

/**
 * Bridge for macOS app menu keyboard shortcuts
 * 
 * The macOS app defines menu items with keyboard equivalents (like CMD+K).
 * When these are triggered, the macOS app sends JavaScript events to the WebView.
 * This hook ensures those events are properly handled by our keyboard system.
 */
export function useMacOSKeyboardBridge() {
  useEffect(() => {
    // Check if we're running in the macOS WebView
    const isMacOSWebView = typeof window !== 'undefined' && 
                          window.navigator.userAgent.includes('Mac OS X') &&
                          // Look for WebView-specific user agent markers
                          (window.navigator.userAgent.includes('WebKit') || 
                           window.navigator.userAgent.includes('WKWebView'));

    if (!isMacOSWebView) {
      return;
    }

    // Listen for keyboard events that might come from the macOS app
    const handleMacOSKeyboardEvent = (event: KeyboardEvent) => {
      // The macOS app sends these events via evaluateJavaScript
      // We need to ensure they're handled by our shortcut manager
      
      // Special handling for events that come from the macOS menu
      // These will have metaKey set and usually come from script injection
      if (event.metaKey || event.ctrlKey) {
        // Let our shortcut manager handle it
        const handled = shortcutManager.handleKeyDown(event);
        
        // If our system handled it, prevent default
        if (handled) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    // Add listener with capture phase to intercept early
    window.addEventListener('keydown', handleMacOSKeyboardEvent, true);

    return () => {
      window.removeEventListener('keydown', handleMacOSKeyboardEvent, true);
    };
  }, []);
}

/**
 * Register global shortcuts that should be available in macOS menus
 * These need to be registered at app startup before any views load
 */
export function registerMacOSGlobalShortcuts() {
  // Import the global shortcuts configuration
  shortcutManager.register('global', [
    {
      id: 'global.command-palette',
      name: 'Command Palette',
      combo: { key: 'k', cmd: true },
      handler: () => {
        // Trigger command palette
        const event = new CustomEvent('open-command-palette');
        window.dispatchEvent(event);
      },
      category: 'Global',
      priority: 100, // High priority for global shortcuts
    },
    {
      id: 'global.new-tab',
      name: 'New Tab',
      combo: { key: 't', cmd: true },
      handler: () => {
        const event = new CustomEvent('new-tab');
        window.dispatchEvent(event);
      },
      category: 'Global',
      priority: 100,
    },
    {
      id: 'global.close-tab',
      name: 'Close Tab',
      combo: { key: 'w', cmd: true },
      handler: () => {
        const event = new CustomEvent('close-tab');
        window.dispatchEvent(event);
      },
      category: 'Global',
      priority: 100,
    },
  ]);
}