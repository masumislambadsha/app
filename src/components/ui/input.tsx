import * as React from "react"
import { Input as HeroInput, TextField } from "@heroui/react"
import { cn } from "cn"

type InputProps = React.ComponentProps<"input">

/**
 * HeroUI text input. Renders a real <input> so `name`, `required` and native
 * constraint validation keep working inside <form action={serverAction}>.
 */
function Input({ className, type, ...props }: InputProps) {
  return (
    <TextField fullWidth>
      <HeroInput
        type={type}
        data-slot="input"
        className={cn("w-full", className)}
        {...props}
      />
    </TextField>
  )
}

export { Input }
