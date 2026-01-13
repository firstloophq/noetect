import { useState } from "react";
import { X, File } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { ImageViewer } from "./ImageViewer";
import type { Attachment } from "@/types/attachments";
import { isImageMimeType, formatFileSize } from "@/types/attachments";

interface AttachmentThumbnailProps {
    attachment: Attachment;
    onRemove?: () => void;
    size?: "sm" | "md" | "lg";
}

export function AttachmentThumbnail({ attachment, onRemove, size = "md" }: AttachmentThumbnailProps) {
    const { currentTheme } = useTheme();
    const { styles } = currentTheme;
    const [viewerOpen, setViewerOpen] = useState(false);
    const [imageError, setImageError] = useState(false);

    const isImage = isImageMimeType(attachment.mimeType) && !imageError;

    const sizeClasses = {
        sm: "size-12",
        md: "size-16",
        lg: "size-24",
    };

    const sizeClass = sizeClasses[size];

    return (
        <>
            <div
                className={`relative group rounded-lg overflow-hidden cursor-pointer ${sizeClass}`}
                style={{
                    backgroundColor: styles.surfaceSecondary,
                    border: `1px solid ${styles.borderDefault}`,
                }}
                onClick={() => isImage && setViewerOpen(true)}
                title={`${attachment.originalName} (${formatFileSize(attachment.size)})`}
            >
                {isImage ? (
                    <img
                        src={attachment.url}
                        alt={attachment.originalName}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1">
                        <File className="size-6" style={{ color: styles.contentSecondary }} />
                        <span
                            className="text-[9px] truncate w-full text-center mt-0.5"
                            style={{ color: styles.contentTertiary }}
                        >
                            {attachment.originalName.split(".").pop()?.toUpperCase()}
                        </span>
                    </div>
                )}

                {/* Hover overlay */}
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    style={{ backgroundColor: `${styles.surfacePrimary}80` }}
                >
                    {isImage && (
                        <span className="text-xs font-medium" style={{ color: styles.contentPrimary }}>
                            View
                        </span>
                    )}
                </div>

                {/* Remove button */}
                {onRemove && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full"
                        style={{
                            backgroundColor: styles.semanticDestructive,
                            color: "white",
                        }}
                        title="Remove"
                    >
                        <X className="size-3" />
                    </button>
                )}
            </div>

            {isImage && (
                <ImageViewer
                    open={viewerOpen}
                    onOpenChange={setViewerOpen}
                    src={attachment.url}
                    alt={attachment.originalName}
                    filename={attachment.originalName}
                />
            )}
        </>
    );
}
