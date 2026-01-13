// Browser/Bun-safe polyfill for the debug module
// This replaces Node.js-specific debug module with a simple logger

interface DebugInstance {
  (msg: string, ...args: unknown[]): void;
  enabled: boolean;
  namespace: string;
  log: (...args: unknown[]) => void;
  extend: (suffix: string) => DebugInstance;
}

interface Debug {
  (namespace: string): DebugInstance;
  enabled: (namespace: string) => boolean;
  names: string[];
  skips: string[];
}

const createDebugger = (namespace: string): DebugInstance => {
  const debug = (msg: string, ...args: unknown[]) => {
    // Disable micromark debugging
    if (namespace.includes('micromark') || namespace.startsWith('micromark')) {
      return;
    }
    if (debug.enabled) {
      console.log(`[${namespace}] ${msg}`, ...args);
    }
  };

  // Disable micromark by default
  debug.enabled = !namespace.includes('micromark');
  debug.namespace = namespace;
  debug.log = (...args: unknown[]) => console.log(...args);
  debug.extend = (suffix: string) => createDebugger(`${namespace}:${suffix}`);

  return debug;
};

const debug: Debug = (namespace: string) => createDebugger(namespace);
debug.enabled = () => true;
debug.names = [];
debug.skips = [];

export = debug;