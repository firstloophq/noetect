import { useEffect, useState, useCallback, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
    Trash2,
    Upload,
    Grid,
    List,
    Download,
    Copy,
    Check,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { ImageViewer } from "@/components/ImageViewer";
import type { Attachment } from "@/types/attachments";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

type ViewMode = "grid" | "list";

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
        return "Yesterday";
    } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: "short" });
    } else {
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
}

export default function UploadsBrowserView() {
    const { currentTheme } = useTheme();
    const [uploads, setUploads] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [selectedImage, setSelectedImage] = useState<Attachment | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchUploads = useCallback(async () => {
        try {
            const response = await fetch("/api/uploads/list");
            const data = await response.json();
            setUploads(data.uploads || []);
        } catch (error) {
            console.error("Failed to fetch uploads:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUploads();
    }, [fetchUploads]);

    const handleDelete = async (filename: string) => {
        try {
            const response = await fetch("/api/uploads/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename }),
            });
            if (response.ok) {
                setUploads((prev) => prev.filter((u) => u.filename !== filename));
            }
        } catch (error) {
            console.error("Failed to delete upload:", error);
        }
    };

    const handleUpload = async (files: FileList | null) => {
        if (!files) return;

        for (const file of Array.from(files)) {
            if (!file.type.startsWith("image/")) continue;

            const formData = new FormData();
            formData.append("file", file);

            try {
                const response = await fetch("/api/uploads", {
                    method: "POST",
                    body: formData,
                });
                const result = await response.json();
                if (result.success && result.data) {
                    setUploads((prev) => [result.data, ...prev]);
                }
            } catch (error) {
                console.error("Failed to upload file:", error);
            }
        }
    };

    const handleCopyUrl = async (upload: Attachment) => {
        const fullUrl = `${window.location.origin}${upload.url}`;
        await navigator.clipboard.writeText(fullUrl);
        setCopiedId(upload.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDownload = (upload: Attachment) => {
        const link = document.createElement("a");
        link.href = upload.url;
        link.download = upload.originalName || upload.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <div
            className="flex flex-col h-full"
            style={{ backgroundColor: currentTheme.styles.surfacePrimary }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-end gap-2 px-4 py-3 border-b"
                style={{ borderColor: currentTheme.styles.borderDefault }}
            >
                <div
                    className="flex rounded-md border"
                    style={{ borderColor: currentTheme.styles.borderDefault }}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-r-none"
                        onClick={() => setViewMode("grid")}
                        style={{
                            backgroundColor:
                                viewMode === "grid"
                                    ? currentTheme.styles.surfaceAccent
                                    : "transparent",
                        }}
                    >
                        <Grid className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-l-none"
                        onClick={() => setViewMode("list")}
                        style={{
                            backgroundColor:
                                viewMode === "list"
                                    ? currentTheme.styles.surfaceAccent
                                    : "transparent",
                        }}
                    >
                        <List className="size-4" />
                    </Button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleUpload(e.target.files)}
                    className="hidden"
                />
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        backgroundColor: currentTheme.styles.surfaceAccent,
                        color: currentTheme.styles.contentPrimary,
                    }}
                >
                    <Upload className="size-4 mr-2" />
                    Upload
                </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                {loading ? (
                    <div
                        className="flex items-center justify-center h-48"
                        style={{ color: currentTheme.styles.contentSecondary }}
                    >
                        Loading...
                    </div>
                ) : uploads.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center h-48 gap-2"
                        style={{ color: currentTheme.styles.contentSecondary }}
                    >
                        <p>No media yet</p>
                        <p className="text-sm">Upload images to get started</p>
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-6 gap-2 p-4">
                        {uploads.map((upload) => (
                            <ContextMenu key={upload.id}>
                                <ContextMenuTrigger>
                                    <div
                                        className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2"
                                        style={{
                                            backgroundColor: currentTheme.styles.surfaceMuted,
                                            border: `1px solid ${currentTheme.styles.borderDefault}`,
                                        }}
                                        onClick={() => setSelectedImage(upload)}
                                    >
                                        <img
                                            src={upload.url}
                                            alt={upload.originalName}
                                            className="w-full h-full object-cover"
                                        />
                                        <div
                                            className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{
                                                background: `linear-gradient(to top, ${currentTheme.styles.surfacePrimary}ee, transparent)`,
                                            }}
                                        >
                                            <p
                                                className="text-xs truncate"
                                                style={{ color: currentTheme.styles.contentPrimary }}
                                            >
                                                {upload.originalName || upload.filename}
                                            </p>
                                            <p
                                                className="text-xs"
                                                style={{ color: currentTheme.styles.contentSecondary }}
                                            >
                                                {formatFileSize(upload.size)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(upload.filename);
                                            }}
                                            className="absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{
                                                backgroundColor: currentTheme.styles.semanticDestructive,
                                                color: "white",
                                            }}
                                            title="Delete"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                    <ContextMenuItem onClick={() => setSelectedImage(upload)}>
                                        View
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => handleCopyUrl(upload)}>
                                        {copiedId === upload.id ? (
                                            <>
                                                <Check className="size-4 mr-2" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="size-4 mr-2" />
                                                Copy URL
                                            </>
                                        )}
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => handleDownload(upload)}>
                                        <Download className="size-4 mr-2" />
                                        Download
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        onClick={() => handleDelete(upload.filename)}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="size-4 mr-2" />
                                        Delete
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        ))}
                    </div>
                ) : (
                    <div className="divide-y" style={{ borderColor: currentTheme.styles.borderDefault }}>
                        {uploads.map((upload) => (
                            <ContextMenu key={upload.id}>
                                <ContextMenuTrigger>
                                    <div
                                        className="flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors hover:bg-opacity-50"
                                        style={{
                                            backgroundColor: "transparent",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                currentTheme.styles.surfaceSecondary;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "transparent";
                                        }}
                                        onClick={() => setSelectedImage(upload)}
                                    >
                                        <div
                                            className="size-10 rounded overflow-hidden flex-shrink-0"
                                            style={{
                                                backgroundColor: currentTheme.styles.surfaceMuted,
                                            }}
                                        >
                                            <img
                                                src={upload.url}
                                                alt={upload.originalName}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className="text-sm truncate"
                                                style={{ color: currentTheme.styles.contentPrimary }}
                                            >
                                                {upload.originalName || upload.filename}
                                            </p>
                                            <p
                                                className="text-xs"
                                                style={{ color: currentTheme.styles.contentSecondary }}
                                            >
                                                {formatFileSize(upload.size)} &middot; {formatDate(upload.createdAt)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCopyUrl(upload);
                                                }}
                                                title="Copy URL"
                                            >
                                                {copiedId === upload.id ? (
                                                    <Check className="size-4" />
                                                ) : (
                                                    <Copy className="size-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(upload);
                                                }}
                                                title="Download"
                                            >
                                                <Download className="size-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(upload.filename);
                                                }}
                                                title="Delete"
                                                style={{ color: currentTheme.styles.semanticDestructive }}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                    <ContextMenuItem onClick={() => setSelectedImage(upload)}>
                                        View
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => handleCopyUrl(upload)}>
                                        {copiedId === upload.id ? (
                                            <>
                                                <Check className="size-4 mr-2" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="size-4 mr-2" />
                                                Copy URL
                                            </>
                                        )}
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => handleDownload(upload)}>
                                        <Download className="size-4 mr-2" />
                                        Download
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        onClick={() => handleDelete(upload.filename)}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="size-4 mr-2" />
                                        Delete
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Image Viewer Modal */}
            <ImageViewer
                open={!!selectedImage}
                onOpenChange={(open) => !open && setSelectedImage(null)}
                src={selectedImage?.url || ""}
                alt={selectedImage?.originalName || ""}
                filename={selectedImage?.filename || ""}
            />
        </div>
    );
}
