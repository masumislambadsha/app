"use client"

import * as React from "react"
import { I18nProvider, TimeField as HeroTimeField } from "@heroui/react"
import { parseTime, Time } from "@internationalized/date"
import { cn } from "cn"

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/

function toTime(value: string | null | undefined): Time | null {
  if (!value || !HH_MM.test(value)) return null
  try {
    return parseTime(value)
  } catch {
    return null
  }
}

function formatTime(value: Time | null): string {
  if (!value) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(value.hour)}:${pad(value.minute)}`
}

type TimeFieldFieldProps = {
  name: string
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  ariaLabel?: string
  labelledBy?: string
  isRequired?: boolean
  isDisabled?: boolean
  className?: string
}

/**
 * HeroUI TimeField mirrored into a hidden `name` field formatted as `HH:MM`
 * so plain <form action={serverAction}> submissions keep working unchanged.
 */
export function TimeFieldField({
  name,
  defaultValue,
  value,
  onValueChange,
  ariaLabel,
  labelledBy,
  isRequired,
  isDisabled,
  className,
}: TimeFieldFieldProps) {
  const [inner, setInner] = React.useState<Time | null>(() => toTime(defaultValue))
  const isControlled = value !== undefined
  const current = isControlled ? toTime(value) : inner

  const handleChange = React.useCallback(
    (next: Time | null) => {
      if (!isControlled) setInner(next)
      onValueChange?.(formatTime(next))
    },
    [isControlled, onValueChange]
  )

  return (
    <>
      <input type="hidden" name={name} value={formatTime(current)} />
      <I18nProvider locale="en-GB">
        <HeroTimeField
          {...(isControlled ? { value: current ?? undefined } : { defaultValue: current ?? undefined })}
          onChange={handleChange}
          granularity="minute"
          isRequired={isRequired}
          isDisabled={isDisabled}
          aria-label={ariaLabel}
          aria-labelledby={labelledBy}
          className={cn("w-full", className)}
        >
          <HeroTimeField.Group className="w-full">
            <HeroTimeField.InputContainer>
              <HeroTimeField.Input>
                {(segment) => <HeroTimeField.Segment segment={segment} />}
              </HeroTimeField.Input>
            </HeroTimeField.InputContainer>
          </HeroTimeField.Group>
        </HeroTimeField>
      </I18nProvider>
    </>
  )
}
