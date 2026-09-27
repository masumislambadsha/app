import * as React from "react"
import { Alert as HeroAlert } from "@heroui/react"
import { cn } from "cn"

type AlertVariant = "default" | "destructive"

function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof HeroAlert.Root> & { variant?: AlertVariant }) {
  return (
    <HeroAlert.Root
      data-slot="alert"
      status={variant === "destructive" ? "danger" : "default"}
      className={cn(
        "rounded-2xl",
        variant === "destructive" &&
          "border-red-200 bg-red-50 text-red-800 *:[svg]:text-red-600",
        className
      )}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <HeroAlert.Title
      data-slot="alert-title"
      className={cn("font-medium", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <HeroAlert.Description
      data-slot="alert-description"
      className={cn("text-sm", className)}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }