import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "./ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "./ui/button";
import { Download, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";

interface ImageViewerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    src: string;
    alt?: string;
    filename?: string;
}

export function ImageViewer({ open, onOpenChange, src, alt, filename }: ImageViewerProps) {
    const { currentTheme } = useTheme();
    const { styles } = currentTheme;
    const [zoom, setZoom] = useState(1);

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = src;
        link.download = filename || "image";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.25, 0.5));
    };

    const resetZoom = () => {
        setZoom(1);
    };

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            if (!newOpen) resetZoom();
            onOpenChange(newOpen);
        }}>
            <DialogContent
                className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden"
                style={{
                    backgroundColor: styles.surfacePrimary,
                    borderColor: styles.borderDefault,
                }}
            >
                <VisuallyHidden>
                    <DialogTitle>{alt || filename || "Image preview"}</DialogTitle>
                </VisuallyHidden>

                {/* Toolbar */}
                <div
                    className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2"
                    style={{
                        backgroundColor: `${styles.surfacePrimary}ee`,
                        borderBottom: `1px solid ${styles.borderDefault}`,
                    }}
                >
                    <div
                        className="text-sm font-medium truncate max-w-[300px]"
                        style={{ color: styles.contentPrimary }}
                    >
                        {filename || alt || "Image"}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom out">
                            <ZoomOut className="size-4" />
                        </Button>
                        <span
                            className="text-xs min-w-[48px] text-center"
                            style={{ color: styles.contentSecondary }}
                        >
                            {Math.round(zoom * 100)}%
                        </span>
                        <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom in">
                            <ZoomIn className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
                            <Download className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} title="Close">
                            <X className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Image container */}
                <div
                    className="flex items-center justify-center overflow-auto pt-12 pb-4 px-4"
                    style={{
                        minHeight: "400px",
                        maxHeight: "calc(90vh - 56px)",
                    }}
                >
                    <img
                        src={src}
                        alt={alt || "Preview"}
                        style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: "center center",
                            transition: "transform 0.2s ease",
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                        }}
                        onDoubleClick={resetZoom}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
