import * as React from "react"
import { Card as HeroCard } from "@heroui/react"
import { cn } from "cn"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof HeroCard.Root> & { size?: "default" | "sm" }) {
  return (
    <HeroCard.Root
      data-slot="card"
      data-size={size}
      className={cn(
        "border border-warm-100 p-(--card-spacing) [--card-spacing:--spacing(4)] data-[size=sm]:[--card-spacing:--spacing(3)]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <HeroCard.Header
      data-slot="card-header"
      className={cn("gap-1", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <HeroCard.Title
      data-slot="card-title"
      className={cn("font-heading font-bold tracking-tight", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <HeroCard.Description
      data-slot="card-description"
      className={cn(className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "absolute top-2 right-2 col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <HeroCard.Content
      data-slot="card-content"
      className={cn("gap-0 px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <HeroCard.Footer
      data-slot="card-footer"
      className={cn("border-t border-warm-100 bg-warm-50 p-4", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}