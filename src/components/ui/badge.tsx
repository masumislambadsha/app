import * as React from "react"
import { Badge as HeroBadge } from "@heroui/react"
import { cn } from "cn"

function Badge({
  className,
  ...props
}: React.ComponentProps<typeof HeroBadge.Root>) {
  return (
    <HeroBadge.Root
      data-slot="badge"
      className={cn("h-5 px-2 font-semibold", className)}
      {...props}
    />
  )
}

export { Badge }