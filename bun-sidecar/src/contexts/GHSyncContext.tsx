import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useWorkspaceContext } from "./WorkspaceContext";
import { GitAuthMode, AutoSyncConfig } from "@/types/Workspace";

interface SyncStatus {
    checking: boolean;
    syncing: boolean;
    behindCount: number;
    aheadCount: number;
    hasMergeConflict: boolean;
    lastChecked: Date | null;
    lastSynced: Date | null;
    error: string | null;
}

interface SetupStatus {
    checked: boolean;
    gitInstalled: boolean;
    gitInitialized: boolean;
    hasRemote: boolean;
    hasPAT: boolean;
}

interface GHSyncContextValue {
    status: SyncStatus;
    setupStatus: SetupStatus;
    checkForChanges: () => Promise<void>;
    sync: () => Promise<void>;
    recheckSetup: () => Promise<void>;
    isReady: boolean; // true if git is initialized and has remote
    needsSetup: boolean; // true if PAT is missing (when using PAT auth) or git not configured
    gitAuthMode: GitAuthMode;
    setGitAuthMode: (mode: GitAuthMode) => void;
    autoSync: AutoSyncConfig;
    setAutoSyncConfig: (config: Partial<AutoSyncConfig>) => void;
}

const GHSyncContext = createContext<GHSyncContextValue | null>(null);

const CHANGE_DEBOUNCE_MS = 5000; // 5 seconds - batching window for local changes

export function GHSyncProvider(props: { children: React.ReactNode }) {
    const { children } = props;
    const { gitAuthMode, setGitAuthMode, autoSync, setAutoSyncConfig } = useWorkspaceContext();
    const [isReady, setIsReady] = useState(false);
    const [status, setStatus] = useState<SyncStatus>({
        checking: false,
        syncing: false,
        behindCount: 0,
        aheadCount: 0,
        hasMergeConflict: false,
        lastChecked: null,
        lastSynced: null,
        error: null,
    });
    const [setupStatus, setSetupStatus] = useState<SetupStatus>({
        checked: false,
        gitInstalled: true, // Assume true until we know otherwise
        gitInitialized: false,
        hasRemote: false,
        hasPAT: false,
    });
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const syncRef = useRef<(() => Promise<void>) | null>(null);
    const changeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileWatcherRef = useRef<{ stop: () => void } | null>(null);

    // Check if GitHub PAT is set
    const checkPAT = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch("/api/secrets/list");
            if (response.ok) {
                const data = await response.json();
                const patSecret = data.secrets?.find((s: { key: string; hasValue: boolean }) => s.key === "GITHUB_PAT");
                return patSecret?.hasValue ?? false;
            }
        } catch {
            // Ignore errors
        }
        return false;
    }, []);

    // Check if git is installed on the system
    const checkGitInstalled = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch("/api/git/installed");
            if (response.ok) {
                const data = await response.json();
                return data.installed ?? false;
            }
        } catch {
            // Ignore errors
        }
        return false;
    }, []);

    // Check if git is initialized and has a remote
    const checkGitReady = useCallback(async () => {
        try {
            // First check if git is installed
            const gitInstalled = await checkGitInstalled();
            if (!gitInstalled) {
                setSetupStatus(s => ({
                    ...s,
                    gitInstalled: false,
                    gitInitialized: false,
                    hasRemote: false,
                }));
                setIsReady(false);
                return false;
            }

            const response = await fetch("/api/git/status");
            if (response.ok) {
                const data = await response.json();
                const ready = data.initialized && data.hasRemote;
                setIsReady(ready);
                setSetupStatus(s => ({
                    ...s,
                    gitInstalled: true,
                    gitInitialized: data.initialized,
                    hasRemote: data.hasRemote,
                }));
                if (data.hasMergeConflict) {
                    setStatus(s => ({ ...s, hasMergeConflict: true }));
                }
                return ready;
            }
        } catch {
            // If the API fails, git might not be installed
            setSetupStatus(s => ({
                ...s,
                gitInstalled: false,
                gitInitialized: false,
                hasRemote: false,
            }));
        }
        setIsReady(false);
        return false;
    }, [checkGitInstalled]);

    // Full setup check (git + PAT)
    const recheckSetup = useCallback(async () => {
        const [hasPAT] = await Promise.all([
            checkPAT(),
            checkGitReady(),
        ]);
        setSetupStatus(s => ({
            ...s,
            checked: true,
            hasPAT,
        }));
    }, [checkPAT, checkGitReady]);

    // Check for remote changes
    const checkForChanges = useCallback(async () => {
        if (!isReady) return;

        setStatus(s => ({ ...s, checking: true, error: null }));

        try {
            const response = await fetch("/api/git/fetch-status", { method: "POST" });
            if (response.ok) {
                const data = await response.json();

                setStatus(s => ({
                    ...s,
                    checking: false,
                    behindCount: data.behindCount,
                    aheadCount: data.aheadCount,
                    lastChecked: new Date(),
                }));

                // Auto-sync if there are incoming changes
                if (data.behindCount > 0) {
                    syncRef.current?.();
                }
            } else {
                const data = await response.json();
                setStatus(s => ({
                    ...s,
                    checking: false,
                    error: data.error || "Failed to check for changes",
                }));
            }
        } catch (error) {
            setStatus(s => ({
                ...s,
                checking: false,
                error: error instanceof Error ? error.message : "Failed to check for changes",
            }));
        }
    }, [isReady]);

    // Sync (commit, pull, then push)
    const sync = useCallback(async () => {
        if (!isReady) return;

        setStatus(s => ({ ...s, syncing: true, error: null }));

        try {
            // First commit any local changes
            const commitResponse = await fetch("/api/git/commit", { method: "POST" });
            if (!commitResponse.ok) {
                const data = await commitResponse.json();
                throw new Error(data.error || "Commit failed");
            }

            // Then pull
            const pullResponse = await fetch("/api/git/pull", { method: "POST" });
            if (!pullResponse.ok) {
                const data = await pullResponse.json();
                // Check for merge conflict
                if (data.error?.includes("conflict")) {
                    setStatus(s => ({ ...s, syncing: false, hasMergeConflict: true, error: "Merge conflict detected. Please resolve conflicts before syncing." }));
                    return;
                }
                throw new Error(data.error || "Pull failed");
            }

            // Then push
            const pushResponse = await fetch("/api/git/push", { method: "POST" });
            if (!pushResponse.ok) {
                const data = await pushResponse.json();
                throw new Error(data.error || "Push failed");
            }

            // Success - reset counts
            setStatus(s => ({
                ...s,
                syncing: false,
                behindCount: 0,
                aheadCount: 0,
                lastChecked: new Date(),
                lastSynced: new Date(),
            }));
        } catch (error) {
            setStatus(s => ({
                ...s,
                syncing: false,
                error: error instanceof Error ? error.message : "Sync failed",
            }));
        }
    }, [isReady]);

    // Keep syncRef updated
    useEffect(() => {
        syncRef.current = sync;
    }, [sync]);

    // Initial check on mount
    useEffect(() => {
        recheckSetup().then(() => {
            // checkForChanges will be triggered by isReady changing
        });
    }, [recheckSetup]);

    // Start polling when ready
    useEffect(() => {
        if (isReady && setupStatus.hasPAT) {
            checkForChanges();
        }
    }, [isReady, setupStatus.hasPAT, checkForChanges]);

    // Poll for changes based on autoSync interval
    useEffect(() => {
        if (!isReady || !autoSync.enabled) {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            return;
        }

        const pollInterval = autoSync.intervalSeconds * 1000;
        pollIntervalRef.current = setInterval(() => {
            checkForChanges();
        }, pollInterval);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [isReady, autoSync.enabled, autoSync.intervalSeconds, checkForChanges]);

    // Handle file watching for auto-sync on changes
    useEffect(() => {
        // Only watch files if auto-sync on changes is enabled and we're ready
        if (!isReady || !autoSync.enabled || !autoSync.syncOnChanges) {
            // Clear any pending debounce
            if (changeDebounceRef.current) {
                clearTimeout(changeDebounceRef.current);
                changeDebounceRef.current = null;
            }
            // Stop file watcher if running
            if (fileWatcherRef.current) {
                fileWatcherRef.current.stop();
                fileWatcherRef.current = null;
            }
            return;
        }

        // Set up file watcher using polling (checking git status periodically)
        // This is simpler than watching all individual files
        let lastChangeDetected: number | null = null;
        let watcherActive = true;

        const watchForChanges = async () => {
            if (!watcherActive) return;

            try {
                const response = await fetch("/api/git/status");
                if (response.ok) {
                    const data = await response.json();
                    const hasChanges = data.initialized && data.hasUncommittedChanges;

                    if (hasChanges) {
                        const now = Date.now();
                        // Only update lastChangeDetected if it's a new change detection
                        if (lastChangeDetected === null || now - lastChangeDetected > CHANGE_DEBOUNCE_MS) {
                            lastChangeDetected = now;

                            // Clear any existing debounce timer
                            if (changeDebounceRef.current) {
                                clearTimeout(changeDebounceRef.current);
                            }

                            // Set up debounced sync
                            changeDebounceRef.current = setTimeout(() => {
                                if (watcherActive && syncRef.current) {
                                    syncRef.current();
                                }
                            }, CHANGE_DEBOUNCE_MS);
                        }
                    }
                }
            } catch (_error) {
                // Silently ignore errors during background watching
            }

            // Schedule next check
            if (watcherActive) {
                setTimeout(watchForChanges, 3000); // Check every 3 seconds
            }
        };

        // Start watching
        watchForChanges();

        // Cleanup function
        fileWatcherRef.current = {
            stop: () => {
                watcherActive = false;
                if (changeDebounceRef.current) {
                    clearTimeout(changeDebounceRef.current);
                    changeDebounceRef.current = null;
                }
            },
        };

        return () => {
            watcherActive = false;
            if (changeDebounceRef.current) {
                clearTimeout(changeDebounceRef.current);
                changeDebounceRef.current = null;
            }
        };
    }, [isReady, autoSync.enabled, autoSync.syncOnChanges]);

    // Re-check ready state when navigating (in case user sets up git)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                checkGitReady();
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [checkGitReady]);

    // Computed: needs setup if git not installed, git not configured with remote,
    // or PAT missing when using PAT auth mode
    const needsSetup = setupStatus.checked && (
        !setupStatus.gitInstalled ||
        !setupStatus.hasRemote ||
        (gitAuthMode === "pat" && !setupStatus.hasPAT)
    );

    return (
        <GHSyncContext.Provider value={{
            status,
            setupStatus,
            checkForChanges,
            sync,
            recheckSetup,
            isReady,
            needsSetup,
            gitAuthMode,
            setGitAuthMode,
            autoSync,
            setAutoSyncConfig,
        }}>
            {children}
        </GHSyncContext.Provider>
    );
}

export function useGHSync() {
    const context = useContext(GHSyncContext);
    if (!context) {
        throw new Error("useGHSync must be used within a GHSyncProvider");
    }
    return context;
}
