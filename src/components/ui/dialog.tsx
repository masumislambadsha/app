"use client"

import * as React from "react"
import { Modal as HeroModal } from "@heroui/react"
import { cn } from "cn"

type DialogSize = "xs" | "sm" | "md" | "lg" | "full"

type DialogProps = Omit<
  React.ComponentProps<typeof HeroModal.Root>,
  "isOpen" | "onOpenChange" | "state" | "children"
> & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

/** Legacy Base UI shape (`open`) mapped onto HeroUI Modal (`isOpen`). */
function Dialog({ open, onOpenChange, children, ...props }: DialogProps) {
  return (
    <HeroModal.Root data-slot="dialog" isOpen={open} onOpenChange={onOpenChange} {...props}>
      {children}
    </HeroModal.Root>
  )
}

function DialogTrigger({
  className,
  ...props
}: React.ComponentProps<typeof HeroModal.Trigger>) {
  return <HeroModal.Trigger data-slot="dialog-trigger" className={className} {...props} />
}

function DialogClose({
  className,
  ...props
}: React.ComponentProps<typeof HeroModal.CloseTrigger>) {
  return <HeroModal.CloseTrigger data-slot="dialog-close" className={className} {...props} />
}

function DialogContent({
  className,
  children,
  size = "sm",
  showCloseButton = true,
  ...props
}: Omit<React.ComponentProps<typeof HeroModal.Dialog>, "children"> & {
  size?: DialogSize
  showCloseButton?: boolean
  children?: React.ReactNode
}) {
  return (
    <HeroModal.Backdrop data-slot="dialog-overlay">
      <HeroModal.Container size={size}>
        <HeroModal.Dialog
          data-slot="dialog-content"
          className={cn("gap-4 p-4 sm:max-w-sm", className)}
          {...props}
        >
          {children}
          {showCloseButton ? <HeroModal.CloseTrigger /> : null}
        </HeroModal.Dialog>
      </HeroModal.Container>
    </HeroModal.Backdrop>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <HeroModal.Header
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <HeroModal.Heading
      data-slot="dialog-title"
      className={cn("font-heading text-base font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <HeroModal.Footer
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-surface-secondary p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}