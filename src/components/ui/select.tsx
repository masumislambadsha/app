"use client"

import * as React from "react"
import {
  ListBox,
  ListBoxItem,
  Select as HeroSelect,
} from "@heroui/react"
import { cn } from "cn"

type SelectOption = { value: string; label: string }

type SelectFieldProps = {
  name: string
  options: SelectOption[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  isRequired?: boolean
  isDisabled?: boolean
  ariaLabel?: string
  labelledBy?: string
  className?: string
}

/**
 * HeroUI Select mirrored into a hidden `name` field so plain
 * <form action={serverAction}> submissions keep working unchanged.
 */
export function SelectField({
  name,
  options,
  defaultValue,
  value,
  onValueChange,
  placeholder = "Select an option",
  isRequired,
  isDisabled,
  ariaLabel,
  labelledBy,
  className,
}: SelectFieldProps) {
  const [inner, setInner] = React.useState<string | null>(
    defaultValue ?? options[0]?.value ?? null
  )
  const isControlled = value !== undefined
  const current = isControlled ? (value || null) : inner

  const handleChange = React.useCallback(
    (key: React.Key | null) => {
      const next = key === null ? null : String(key)
      if (!isControlled) setInner(next)
      if (next !== null) onValueChange?.(next)
    },
    [isControlled, onValueChange]
  )

  const selected = options.find((o) => o.value === current)

  return (
    <>
      <input type="hidden" name={name} value={current ?? ""} />
      <HeroSelect
        selectedKey={current}
        onSelectionChange={handleChange}
        isRequired={isRequired}
        isDisabled={isDisabled}
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        className={cn("w-full", className)}
      >
        <HeroSelect.Trigger className="w-full">
          <HeroSelect.Value>{() => selected?.label ?? placeholder}</HeroSelect.Value>
          <HeroSelect.Indicator />
        </HeroSelect.Trigger>
        <HeroSelect.Popover>
          <ListBox>
            {options.map((o) => (
              <ListBoxItem key={o.value} id={o.value} textValue={o.label}>
                {o.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </HeroSelect.Popover>
      </HeroSelect>
    </>
  )
}
