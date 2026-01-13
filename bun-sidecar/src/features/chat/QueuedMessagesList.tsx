import { useState, useCallback } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, X, Check, Image } from "lucide-react";
import type { QueuedMessage } from "./index";
import {
    DndContext,
    DragEndEvent,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QueuedMessagesListProps {
    messages: QueuedMessage[];
    onRemove: (id: string) => void;
    onEdit: (id: string, text: string) => void;
    onReorder: (messages: QueuedMessage[]) => void;
    onClearAll: () => void;
}

interface SortableQueueItemProps {
    message: QueuedMessage;
    onRemove: (id: string) => void;
    onEdit: (id: string, text: string) => void;
}

function SortableQueueItem({ message, onRemove, onEdit }: SortableQueueItemProps) {
    const { currentTheme } = useTheme();
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(message.text);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: message.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleSaveEdit = useCallback(() => {
        onEdit(message.id, editText);
        setIsEditing(false);
    }, [message.id, editText, onEdit]);

    const handleCancelEdit = useCallback(() => {
        setEditText(message.text);
        setIsEditing(false);
    }, [message.text]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSaveEdit();
        } else if (e.key === "Escape") {
            handleCancelEdit();
        }
    }, [handleSaveEdit, handleCancelEdit]);

    const truncatedText = message.text.length > 50
        ? message.text.slice(0, 50) + "..."
        : message.text;

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                backgroundColor: currentTheme.styles.surfaceSecondary,
                borderColor: currentTheme.styles.borderDefault,
            }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg border text-sm group"
        >
            {/* Drag handle */}
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-0.5 opacity-50 hover:opacity-100 transition-opacity focus:outline-none"
                style={{ color: currentTheme.styles.contentSecondary }}
            >
                <GripVertical className="h-3.5 w-3.5" />
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
                {/* Attachment indicator */}
                {message.attachments.length > 0 && (
                    <span
                        className="flex items-center gap-0.5 text-xs flex-shrink-0"
                        style={{ color: currentTheme.styles.contentSecondary }}
                        title={`${message.attachments.length} image${message.attachments.length > 1 ? "s" : ""}`}
                    >
                        <Image className="h-3 w-3" />
                        <span>{message.attachments.length}</span>
                    </span>
                )}

                {isEditing ? (
                    <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent border-none outline-none text-sm"
                        style={{ color: currentTheme.styles.contentPrimary }}
                        autoFocus
                    />
                ) : (
                    <span
                        className="truncate"
                        style={{ color: currentTheme.styles.contentPrimary }}
                        title={message.text}
                    >
                        {truncatedText || <span style={{ color: currentTheme.styles.contentSecondary }}>(images only)</span>}
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
                {isEditing ? (
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0"
                            onClick={handleSaveEdit}
                            title="Save"
                        >
                            <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0"
                            onClick={handleCancelEdit}
                            title="Cancel"
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                                setEditText(message.text);
                                setIsEditing(true);
                            }}
                            title="Edit"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onRemove(message.id)}
                            title="Remove"
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

export function QueuedMessagesList({
    messages,
    onRemove,
    onEdit,
    onReorder,
    onClearAll,
}: QueuedMessagesListProps) {
    const { currentTheme } = useTheme();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = messages.findIndex((m) => m.id === active.id);
            const newIndex = messages.findIndex((m) => m.id === over.id);
            const reordered = arrayMove(messages, oldIndex, newIndex);
            onReorder(reordered);
        }
    }, [messages, onReorder]);

    if (messages.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1.5 mb-2">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <span
                    className="text-xs font-medium"
                    style={{ color: currentTheme.styles.contentSecondary }}
                >
                    Queued ({messages.length})
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-xs"
                    onClick={onClearAll}
                >
                    Clear all
                </Button>
            </div>

            {/* Sortable list */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={messages.map((m) => m.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="flex flex-col gap-1">
                        {messages.map((message) => (
                            <SortableQueueItem
                                key={message.id}
                                message={message}
                                onRemove={onRemove}
                                onEdit={onEdit}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
