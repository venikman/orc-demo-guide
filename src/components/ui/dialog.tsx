import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-slot="dialog"
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      className="fixed inset-0 z-50 m-0 h-dvh w-dvw bg-transparent p-0 backdrop:bg-black/10 backdrop:backdrop-blur-xs open:flex open:items-stretch open:justify-end"
    >
      {open && children}
    </dialog>
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean; side?: string }) {
  const { showCloseButton: _, side: __, ...rest } = props;
  return (
    <div
      data-slot="dialog-content"
      className={cn(
        "z-50 h-screen w-full max-w-full gap-4 rounded-none bg-background p-4 text-xs/relaxed ring-1 ring-foreground/10 outline-none sm:my-3 sm:mr-3 sm:h-[calc(100dvh-1.5rem)] sm:w-[25rem] sm:max-w-[calc(100vw-1.5rem)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2 data-slot="dialog-title" className={cn("text-sm font-medium", className)} {...props} />
  );
}

export function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}
