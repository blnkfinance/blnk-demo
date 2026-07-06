"use client";

import { CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatDisplayDate,
  parseIsoDateOnly,
  startOfTodayLocal,
  toIsoDateOnly,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  error?: boolean;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Pick a date",
  minDate,
  maxDate,
  className,
  error = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseIsoDateOnly(value), [value]);
  const label = value ? formatDisplayDate(value) : placeholder;
  const today = useMemo(() => startOfTodayLocal(), []);
  const startMonth = useMemo(
    () =>
      minDate
        ? startOfMonth(minDate)
        : new Date(today.getFullYear() - 100, 0, 1),
    [minDate, today]
  );
  const endMonth = useMemo(
    () =>
      maxDate
        ? new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)
        : new Date(today.getFullYear() + 30, 11, 31),
    [maxDate, today]
  );
  const disabledDays = useMemo(() => {
    const matchers = [];
    if (minDate) matchers.push({ before: minDate });
    if (maxDate) matchers.push({ after: maxDate });
    return matchers.length > 0 ? matchers : undefined;
  }, [minDate, maxDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-[6px] border bg-platform-input-main-bg px-3 py-2 text-sm font-medium focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-platform-custom-red text-platform-primary-text"
              : "input-focus-shadow border-platform-input-border",
            value ? "text-platform-primary-text" : "text-platform-muted",
            className
          )}
        >
          <span className="truncate">{label}</span>
          <CalendarIcon className="h-4 w-4 shrink-0 text-platform-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0"
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-radix-select-content]")) {
            event.preventDefault();
          }
        }}
      >
        <Calendar
          mode="single"
          captionLayout="dropdown"
          reverseYears
          selected={selected}
          defaultMonth={selected ?? minDate ?? today}
          startMonth={startMonth}
          endMonth={endMonth}
          disabled={disabledDays}
          onSelect={(date) => {
            if (!date) return;
            onChange(toIsoDateOnly(date));
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
