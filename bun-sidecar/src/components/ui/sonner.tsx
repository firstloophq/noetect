import { Toaster as Sonner, ToasterProps } from "sonner"
import { useTheme } from "@/hooks/useTheme"

const Toaster = ({ ...props }: ToasterProps) => {
  const { currentTheme } = useTheme()
  const styles = currentTheme.styles

  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "flex items-center gap-3 w-full min-w-[360px] px-4 py-3 rounded-lg border",
          content: "flex-1 min-w-0",
          title: "text-sm font-medium truncate",
          description: "hidden",
          actionButton: "shrink-0 text-xs font-medium px-2.5 py-1 rounded",
          cancelButton: "shrink-0 text-xs font-medium px-2.5 py-1 rounded opacity-70 hover:opacity-100",
        },
        style: {
          backgroundColor: styles.surfaceSecondary,
          color: styles.contentPrimary,
          borderColor: styles.borderDefault,
          boxShadow: styles.shadowMd,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
