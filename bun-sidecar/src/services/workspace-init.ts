import { createServiceLogger } from "@/lib/logger";
import { initializePaths, hasActiveWorkspace } from "@/storage/root-path";
import { initializeTodosService } from "@/features/todos/fx";
import { initializeNotesService } from "@/features/notes/fx";
import { secrets } from "@/lib/secrets";
import { onStartup } from "@/onStartup";

const logger = createServiceLogger("WORKSPACE-INIT");

/**
 * Initialize or reinitialize all workspace-dependent services.
 * Called at server startup and when switching workspaces.
 */
export async function initializeWorkspaceServices(): Promise<void> {
    logger.info("Initializing workspace services...");

    // Reinitialize paths from global config
    await initializePaths();

    // Load secrets into process.env
    await secrets.loadIntoProcessEnv();

    // Run startup sequence (creates workspace directories if active)
    await onStartup();

    // Initialize feature services (only if workspace is active)
    if (hasActiveWorkspace()) {
        await initializeTodosService();
        await initializeNotesService();
        logger.info("Feature services initialized");
    } else {
        logger.info("No active workspace - feature services not initialized");
    }

    logger.info("Workspace services initialization complete");
}
