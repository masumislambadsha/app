"use client"

import * as React from "react"
import { Label as HeroLabel } from "@heroui/react"
import { cn } from "cn"

function Label({ className, ...props }: React.ComponentProps<typeof HeroLabel>) {
  return (
    <HeroLabel
      data-slot="label"
      className={cn("gap-2 font-medium", className)}
      {...props}
    />
  )
}

export { Label }