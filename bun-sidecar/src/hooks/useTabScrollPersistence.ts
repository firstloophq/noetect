import { useEffect, useRef } from "react";

// Module-level storage survives component unmounts
const scrollPositions = new Map<string, number>();

/**
 * Hook to persist scroll position for a tab's scrollable container.
 * Saves position on every scroll event, restores when content becomes scrollable.
 *
 * @param tabId - The unique tab identifier
 * @returns A ref to attach to the scrollable container element
 */
export function useTabScrollPersistence(tabId: string) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasRestoredRef = useRef(false);

    useEffect(() => {
        const element = scrollRef.current;
        console.log(`[ScrollPersist] Effect running for tab: ${tabId}`);
        console.log(`[ScrollPersist] Element found:`, !!element);

        if (!element) {
            console.log(`[ScrollPersist] No element, returning early`);
            return;
        }

        hasRestoredRef.current = false;
        const savedPosition = scrollPositions.get(tabId);
        console.log(`[ScrollPersist] Saved position for ${tabId}:`, savedPosition);

        // Save scroll position on EVERY scroll event (not just cleanup)
        const handleScroll = () => {
            const currentScroll = element.scrollTop;
            scrollPositions.set(tabId, currentScroll);
            console.log(`[ScrollPersist] Scroll event - saved position: ${currentScroll}`);
        };

        element.addEventListener("scroll", handleScroll);

        // Function to attempt scroll restoration
        const tryRestore = (source: string) => {
            console.log(`[ScrollPersist] tryRestore called from: ${source}`);
            console.log(`[ScrollPersist] - hasRestored: ${hasRestoredRef.current}`);
            console.log(`[ScrollPersist] - savedPosition: ${savedPosition}`);
            console.log(`[ScrollPersist] - scrollHeight: ${element.scrollHeight}`);
            console.log(`[ScrollPersist] - clientHeight: ${element.clientHeight}`);
            console.log(`[ScrollPersist] - isScrollable: ${element.scrollHeight > element.clientHeight}`);

            if (hasRestoredRef.current) {
                console.log(`[ScrollPersist] Already restored, skipping`);
                return;
            }
            if (savedPosition === undefined || savedPosition === 0) {
                console.log(`[ScrollPersist] No saved position or position is 0, marking as restored`);
                hasRestoredRef.current = true;
                return;
            }

            // Only restore if the element is actually scrollable
            if (element.scrollHeight > element.clientHeight) {
                console.log(`[ScrollPersist] Restoring scroll to: ${savedPosition}`);
                element.scrollTop = savedPosition;
                console.log(`[ScrollPersist] scrollTop is now: ${element.scrollTop}`);
                hasRestoredRef.current = true;
            } else {
                console.log(`[ScrollPersist] Not scrollable yet, waiting...`);
            }
        };

        // Try immediately
        tryRestore("initial");

        // Watch for content changes that make the element scrollable
        const observer = new ResizeObserver(() => {
            tryRestore("ResizeObserver");
        });
        observer.observe(element);

        // Also observe children being added (for async content)
        const mutationObserver = new MutationObserver(() => {
            tryRestore("MutationObserver");
        });
        mutationObserver.observe(element, { childList: true, subtree: true });

        // Cleanup
        return () => {
            console.log(`[ScrollPersist] Cleanup for tab: ${tabId}`);
            console.log(`[ScrollPersist] Final saved position: ${scrollPositions.get(tabId)}`);
            element.removeEventListener("scroll", handleScroll);
            observer.disconnect();
            mutationObserver.disconnect();
            // Don't save here - we already saved on scroll events
        };
    }, [tabId]);

    return scrollRef;
}

/**
 * Clear saved scroll position for a tab (e.g., when tab is closed)
 */
export function clearTabScrollPosition(tabId: string) {
    scrollPositions.delete(tabId);
}
