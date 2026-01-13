/**
 * BacklinksPanel Component
 *
 * Displays backlinks (notes that link to the current note) and phantom links
 * (links to notes that don't exist yet) in a collapsible sidebar panel.
 */

import { useEffect, useState, useCallback } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, FileText, AlertCircle } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useNotesAPI } from "@/hooks/useNotesAPI";
import { BacklinksResult } from "./backlinks-types";
import { cn } from "@/lib/utils";

interface BacklinksPanelProps {
    noteFileName: string;
    onOpenNote: (fileName: string) => void;
    onCreateNote: (noteName: string) => void;
}

interface CollapsibleSectionProps {
    title: string;
    count?: number;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

function CollapsibleSection({ title, count, defaultOpen = true, children }: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const { currentTheme } = useTheme();

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-left hover:bg-accent/50 rounded transition-colors">
                <div className="flex items-center gap-1.5">
                    <ChevronDown
                        className={cn("h-3 w-3 transition-transform", !isOpen && "-rotate-90")}
                        style={{ color: currentTheme.styles.contentTertiary }}
                    />
                    <span
                        className="text-[10px] uppercase tracking-wider font-medium"
                        style={{ color: currentTheme.styles.contentTertiary }}
                    >
                        {title}
                    </span>
                </div>
                {count !== undefined && count > 0 && (
                    <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{
                            backgroundColor: currentTheme.styles.surfaceMuted,
                            color: currentTheme.styles.contentSecondary,
                        }}
                    >
                        {count}
                    </span>
                )}
            </CollapsibleTrigger>
            <CollapsibleContent>{children}</CollapsibleContent>
        </Collapsible>
    );
}

export function BacklinksPanel({ noteFileName, onOpenNote, onCreateNote }: BacklinksPanelProps) {
    const [backlinksData, setBacklinksData] = useState<BacklinksResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { currentTheme } = useTheme();
    const notesAPI = useNotesAPI();

    const fetchBacklinks = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await notesAPI.getBacklinks({ fileName: noteFileName });
            setBacklinksData(result);
        } catch (error) {
            console.error("Failed to fetch backlinks:", error);
            setBacklinksData({ backlinks: [], phantomLinks: [] });
        } finally {
            setIsLoading(false);
        }
    }, [noteFileName, notesAPI]);

    useEffect(() => {
        fetchBacklinks();
    }, [fetchBacklinks]);

    if (isLoading) {
        return (
            <div className="p-3">
                <div
                    className="text-xs animate-pulse"
                    style={{ color: currentTheme.styles.contentTertiary }}
                >
                    Loading...
                </div>
            </div>
        );
    }

    const backlinks = backlinksData?.backlinks || [];
    const phantomLinks = backlinksData?.phantomLinks || [];

    return (
        <div className="space-y-2">
            {/* Backlinks section */}
            <CollapsibleSection title="Backlinks" count={backlinks.length} defaultOpen={true}>
                {backlinks.length === 0 ? (
                    <div
                        className="px-2 py-1 text-xs"
                        style={{ color: currentTheme.styles.contentTertiary }}
                    >
                        No backlinks yet
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {backlinks.map((link) => (
                            <button
                                key={link.sourceFile}
                                onClick={() => onOpenNote(link.sourceFile)}
                                className="w-full flex items-center gap-1.5 px-2 py-1 text-left text-xs rounded hover:bg-accent/50 transition-colors truncate"
                                style={{ color: currentTheme.styles.contentSecondary }}
                                title={link.sourceFile}
                            >
                                <FileText className="h-3 w-3 shrink-0" />
                                <span className="truncate">{link.displayName}</span>
                            </button>
                        ))}
                    </div>
                )}
            </CollapsibleSection>

            {/* Phantom links section - only show if there are any */}
            {phantomLinks.length > 0 && (
                <CollapsibleSection title="Phantom Links" count={phantomLinks.length} defaultOpen={true}>
                    <div className="space-y-1">
                        {phantomLinks.map((phantom) => (
                            <div key={phantom.targetName} className="px-2">
                                <button
                                    onClick={() => onCreateNote(phantom.targetName)}
                                    className="w-full flex items-center gap-1.5 py-1 text-left text-xs rounded hover:bg-accent/50 transition-colors"
                                    style={{ color: currentTheme.styles.contentAccent }}
                                    title={`Create "${phantom.targetName}"`}
                                >
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{phantom.targetName}</span>
                                    <span
                                        className="text-[9px] ml-auto"
                                        style={{ color: currentTheme.styles.contentTertiary }}
                                    >
                                        create
                                    </span>
                                </button>
                                <div
                                    className="text-[10px] pl-4 pb-1"
                                    style={{ color: currentTheme.styles.contentTertiary }}
                                >
                                    Referenced in: {phantom.referencedIn.map((f) => f.replace(/\.md$/, "").split("/").pop()).join(", ")}
                                </div>
                            </div>
                        ))}
                    </div>
                </CollapsibleSection>
            )}
        </div>
    );
}

export { CollapsibleSection };
