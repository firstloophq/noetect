import { useRef, useState, useEffect, useCallback, ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";

interface OverlayScrollbarProps {
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    scrollRef?: React.RefObject<HTMLDivElement | null>;
}

// Scrollbar width to hide (macOS native scrollbar is typically 15-17px)
const SCROLLBAR_WIDTH = 20;

/**
 * Custom overlay scrollbar component that works in WKWebView.
 * Uses negative margin technique to hide native scrollbar and renders a custom themed overlay.
 */
export function OverlayScrollbar({
    children,
    className = "",
    style = {},
    scrollRef: externalScrollRef,
}: OverlayScrollbarProps) {
    const { currentTheme } = useTheme();
    const internalScrollRef = useRef<HTMLDivElement>(null);
    const scrollRef = externalScrollRef || internalScrollRef;
    const trackRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);

    const [thumbHeight, setThumbHeight] = useState(0);
    const [thumbTop, setThumbTop] = useState(0);
    const [isScrollable, setIsScrollable] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const dragStartY = useRef(0);
    const dragStartScrollTop = useRef(0);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate thumb size and position based on scroll state
    const updateScrollbar = useCallback(() => {
        const container = scrollRef.current;
        if (!container) return;

        const { scrollHeight, clientHeight, scrollTop } = container;
        const canScroll = scrollHeight > clientHeight;
        setIsScrollable(canScroll);

        if (canScroll) {
            // Calculate thumb height (proportional to visible area)
            const ratio = clientHeight / scrollHeight;
            const minThumbHeight = 30;
            const calculatedHeight = Math.max(clientHeight * ratio, minThumbHeight);
            setThumbHeight(calculatedHeight);

            // Calculate thumb position
            const maxScrollTop = scrollHeight - clientHeight;
            const scrollRatio = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;
            const maxThumbTop = clientHeight - calculatedHeight;
            setThumbTop(scrollRatio * maxThumbTop);
        }
    }, [scrollRef]);

    // Show scrollbar temporarily when scrolling
    const showScrollbar = useCallback(() => {
        setIsVisible(true);
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
            if (!isDragging && !isHovered) {
                setIsVisible(false);
            }
        }, 1000);
    }, [isDragging, isHovered]);

    // Handle scroll events
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const handleScroll = () => {
            updateScrollbar();
            showScrollbar();
        };

        container.addEventListener("scroll", handleScroll);
        return () => container.removeEventListener("scroll", handleScroll);
    }, [scrollRef, updateScrollbar, showScrollbar]);

    // Update scrollbar on resize and content changes
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        updateScrollbar();

        const resizeObserver = new ResizeObserver(() => {
            updateScrollbar();
        });
        resizeObserver.observe(container);

        // Also observe children for content changes
        const mutationObserver = new MutationObserver(() => {
            updateScrollbar();
        });
        mutationObserver.observe(container, { childList: true, subtree: true });

        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [scrollRef, updateScrollbar]);

    // Handle thumb drag
    const handleThumbMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
            dragStartY.current = e.clientY;
            dragStartScrollTop.current = scrollRef.current?.scrollTop || 0;
        },
        [scrollRef]
    );

    // Handle track click (jump to position)
    const handleTrackClick = useCallback(
        (e: React.MouseEvent) => {
            const container = scrollRef.current;
            const track = trackRef.current;
            if (!container || !track) return;

            // Don't handle if clicking on thumb
            if (e.target === thumbRef.current) return;

            const trackRect = track.getBoundingClientRect();
            const clickY = e.clientY - trackRect.top;
            const trackHeight = trackRect.height;

            // Calculate scroll position based on click position
            const scrollRatio = clickY / trackHeight;
            const maxScrollTop = container.scrollHeight - container.clientHeight;
            container.scrollTop = scrollRatio * maxScrollTop;
        },
        [scrollRef]
    );

    // Global mouse move/up handlers for dragging
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const container = scrollRef.current;
            if (!container) return;

            const deltaY = e.clientY - dragStartY.current;
            const { scrollHeight, clientHeight } = container;
            const maxScrollTop = scrollHeight - clientHeight;

            // Convert pixel delta to scroll delta
            const trackHeight = clientHeight - thumbHeight;
            const scrollDelta = trackHeight > 0 ? (deltaY / trackHeight) * maxScrollTop : 0;

            container.scrollTop = dragStartScrollTop.current + scrollDelta;
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, scrollRef, thumbHeight]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    const shouldShowScrollbar = isScrollable && (isVisible || isDragging || isHovered);

    return (
        <div
            className={`relative ${className}`}
            style={{
                ...style,
                overflow: "hidden", // Clip the native scrollbar
            }}
            onMouseEnter={() => {
                setIsHovered(true);
                setIsVisible(true);
            }}
            onMouseLeave={() => {
                setIsHovered(false);
                if (!isDragging) {
                    hideTimeoutRef.current = setTimeout(() => {
                        setIsVisible(false);
                    }, 500);
                }
            }}
        >
            {/* Scrollable content container - use negative margin to hide native scrollbar */}
            <div
                ref={scrollRef as React.RefObject<HTMLDivElement>}
                className="h-full overflow-y-scroll"
                style={{
                    // Push the native scrollbar outside the visible area
                    marginRight: `-${SCROLLBAR_WIDTH}px`,
                    paddingRight: `${SCROLLBAR_WIDTH}px`,
                }}
            >
                {children}
            </div>

            {/* Custom scrollbar overlay */}
            {isScrollable && (
                <div
                    ref={trackRef}
                    className="absolute right-0 top-0 bottom-0 w-2 z-50"
                    style={{
                        opacity: shouldShowScrollbar ? 1 : 0,
                        transition: "opacity 150ms ease-in-out",
                        pointerEvents: shouldShowScrollbar ? "auto" : "none",
                    }}
                    onClick={handleTrackClick}
                >
                    {/* Thumb */}
                    <div
                        ref={thumbRef}
                        className="absolute right-0 w-2 rounded-full cursor-pointer"
                        style={{
                            height: `${thumbHeight}px`,
                            top: `${thumbTop}px`,
                            backgroundColor: isDragging
                                ? currentTheme.styles.contentSecondary
                                : currentTheme.styles.borderDefault,
                            transition: isDragging ? "none" : "background-color 150ms ease-in-out",
                        }}
                        onMouseDown={handleThumbMouseDown}
                        onMouseEnter={() => {
                            if (thumbRef.current && !isDragging) {
                                thumbRef.current.style.backgroundColor = currentTheme.styles.contentTertiary;
                            }
                        }}
                        onMouseLeave={() => {
                            if (thumbRef.current && !isDragging) {
                                thumbRef.current.style.backgroundColor = currentTheme.styles.borderDefault;
                            }
                        }}
                    />
                </div>
            )}
        </div>
    );
}
