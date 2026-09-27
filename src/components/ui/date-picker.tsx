"use client"

import * as React from "react"
import {
  Calendar,
  DateField,
  DatePicker as HeroDatePicker,
  I18nProvider,
} from "@heroui/react"
import { parseDate, type CalendarDate, type DateValue } from "@internationalized/date"
import { cn } from "cn"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function toDateValue(value: string | null | undefined): DateValue | null {
  if (!value || !ISO_DATE.test(value)) return null
  try {
    return parseDate(value)
  } catch {
    return null
  }
}

type DatePickerFieldProps = {
  name: string
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  minValue?: string
  ariaLabel?: string
  labelledBy?: string
  isRequired?: boolean
  className?: string
}

/**
 * HeroUI DatePicker (segmented input + calendar popover) mirrored into a hidden
 * `name` field so plain <form action={serverAction}> submissions keep working.
 */
export function DatePickerField({
  name,
  defaultValue,
  value,
  onValueChange,
  minValue,
  ariaLabel,
  labelledBy,
  isRequired,
  className,
}: DatePickerFieldProps) {
  const [inner, setInner] = React.useState<DateValue | null>(() => toDateValue(defaultValue))
  const isControlled = value !== undefined
  const current = isControlled ? toDateValue(value) : inner

  const handleChange = React.useCallback(
    (next: DateValue | null) => {
      if (!isControlled) setInner(next)
      onValueChange?.(next ? next.toString() : "")
    },
    [isControlled, onValueChange]
  )

  return (
    <>
      <input type="hidden" name={name} value={current ? current.toString() : ""} />
      <I18nProvider locale="en-GB">
        <HeroDatePicker
          {...(isControlled ? { value: current ?? undefined } : { defaultValue: current ?? undefined })}
          onChange={handleChange}
          minValue={toDateValue(minValue) ?? undefined}
          isRequired={isRequired}
          aria-label={ariaLabel}
          aria-labelledby={labelledBy}
          className={cn("w-full", className)}
        >
          <HeroDatePicker.Trigger className="w-full justify-start font-normal">
            <DateField.Group className="w-full flex-1">
              <DateField.InputContainer>
                <DateField.Input>
                  {(segment) => <DateField.Segment segment={segment} />}
                </DateField.Input>
              </DateField.InputContainer>
            </DateField.Group>
            <HeroDatePicker.TriggerIndicator />
          </HeroDatePicker.Trigger>
          <HeroDatePicker.Popover>
            <Calendar>
              <Calendar.Header>
                <Calendar.NavButton slot="previous">&#8249;</Calendar.NavButton>
                <Calendar.Heading />
                <Calendar.NavButton slot="next">&#8250;</Calendar.NavButton>
              </Calendar.Header>
              <Calendar.Grid>
                <Calendar.GridHeader>
                  {(day: string) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                </Calendar.GridHeader>
                <Calendar.GridBody>
                  {(date: CalendarDate) => <Calendar.Cell date={date} />}
                </Calendar.GridBody>
              </Calendar.Grid>
            </Calendar>
          </HeroDatePicker.Popover>
        </HeroDatePicker>
      </I18nProvider>
    </>
  )
}
