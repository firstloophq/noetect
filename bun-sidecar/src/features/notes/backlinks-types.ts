/**
 * Backlinks Index Types
 *
 * Uses Record<string, true> as a JSON-serializable Set for O(1) operations.
 */

// JSON-serializable Set - O(1) add/remove/lookup
export type StringSet = Record<string, true>;

// Helper functions for StringSet operations
export const StringSet = {
    create: (): StringSet => ({}),
    add: (set: StringSet, value: string): void => {
        set[value] = true;
    },
    remove: (set: StringSet, value: string): void => {
        delete set[value];
    },
    has: (set: StringSet, value: string): boolean => value in set,
    toArray: (set: StringSet): string[] => Object.keys(set),
    fromArray: (arr: string[]): StringSet =>
        Object.fromEntries(arr.map((k) => [k, true as const])) as StringSet,
    size: (set: StringSet): number => Object.keys(set).length,
    isEmpty: (set: StringSet): boolean => Object.keys(set).length === 0,
};

// The persisted index structure
export interface BacklinksIndex {
    version: 1;
    lastFullScan: string; // ISO timestamp

    // Inverted index: target → sources that link to it
    // Key: target note name (without .md), Value: set of source filenames
    backlinks: Record<string, StringSet>;

    // Forward index: source → targets it links to
    // Key: source filename, Value: set of target note names
    outboundLinks: Record<string, StringSet>;

    // Phantom links: targets that don't exist as files
    // Key: phantom target name, Value: set of files referencing it
    phantoms: Record<string, StringSet>;

    // File modification times for incremental updates
    // Key: filename, Value: mtime in ms
    mtimes: Record<string, number>;
}

// Query result for UI
export interface BacklinksResult {
    backlinks: Array<{
        sourceFile: string; // e.g., "projects/alpha.md"
        displayName: string; // e.g., "alpha" (for display)
    }>;
    phantomLinks: Array<{
        targetName: string; // e.g., "Not-created-file"
        referencedIn: string[]; // Files that reference this phantom
    }>;
}

// Create an empty index
export function createEmptyIndex(): BacklinksIndex {
    return {
        version: 1,
        lastFullScan: new Date().toISOString(),
        backlinks: {},
        outboundLinks: {},
        phantoms: {},
        mtimes: {},
    };
}
