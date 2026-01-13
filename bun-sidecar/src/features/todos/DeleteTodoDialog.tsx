import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTheme } from "@/hooks/useTheme";

interface DeleteTodoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirmDelete: () => void;
    onCancel: () => void;
}

export function DeleteTodoDialog({ open, onOpenChange, onConfirmDelete, onCancel }: DeleteTodoDialogProps) {
    const { currentTheme } = useTheme();

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent style={{ backgroundColor: currentTheme.styles.surfacePrimary }}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Todo</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure you want to delete this todo? This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirmDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
