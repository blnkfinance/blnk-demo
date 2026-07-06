"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DropdownProps } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CalendarSelectDropdown(props: DropdownProps) {
  const { options, value, onChange, "aria-label": ariaLabel } = props;

  const handleValueChange = (newValue: string) => {
    onChange?.({
      target: { value: newValue },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  return (
    <Select value={value?.toString()} onValueChange={handleValueChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-8 w-auto min-w-[5.5rem] gap-1 border-platform-input-border bg-platform-input-main-bg px-2 py-0 text-sm font-medium shadow-none"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[120]">
        <SelectGroup>
          {options?.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value.toString()}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  navLayout,
  formatters,
  components,
  ...props
}: CalendarProps) {
  const useDropdown = captionLayout !== "label";
  const navButtonClassName =
    "relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-platform-muted transition-colors hover:bg-platform-hover-bg hover:text-platform-primary-text disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none";

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      navLayout={useDropdown ? "around" : navLayout}
      className={cn("rdp-root p-3", useDropdown && "rdp-root--dropdown-nav", className)}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        months: "relative flex flex-col gap-4",
        month: cn(
          "w-full",
          useDropdown
            ? "relative grid grid-cols-[2rem_1fr_2rem] grid-rows-[auto_1fr] items-center gap-y-4"
            : "flex flex-col gap-4"
        ),
        month_caption: cn(
          "relative flex w-full items-center justify-center",
          useDropdown ? "col-start-2 row-start-1 h-8 px-0" : "h-8 px-8"
        ),
        caption_label: cn(
          "text-sm font-medium text-platform-primary-text",
          useDropdown &&
            "flex h-8 items-center gap-1 rounded-md pl-2 pr-1 [&>svg]:size-3.5 [&>svg]:text-platform-muted"
        ),
        dropdowns: cn(
          "relative z-0 flex items-center justify-center gap-2 text-sm font-medium",
          useDropdown && "h-8"
        ),
        dropdown_root: "relative",
        dropdown: "sr-only",
        nav: cn(
          "flex items-center gap-1",
          useDropdown ? "hidden" : "absolute inset-x-0 top-0 justify-between"
        ),
        button_previous: cn(
          navButtonClassName,
          useDropdown && "col-start-1 row-start-1 justify-self-center self-center"
        ),
        button_next: cn(
          navButtonClassName,
          useDropdown && "col-start-3 row-start-1 justify-self-center self-center"
        ),
        month_grid: cn("w-full border-collapse", useDropdown && "col-span-3 row-start-2"),
        weekdays: "flex",
        weekday:
          "flex-1 text-center text-xs font-medium text-platform-muted",
        week: "mt-1 flex w-full",
        day: "relative flex flex-1 items-center justify-center p-0 text-center text-sm",
        day_button:
          "inline-flex h-9 w-9 items-center justify-center rounded-full p-0 font-normal text-platform-primary-text transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        selected: "rdp-selected",
        today: "rdp-today",
        outside: "text-platform-muted opacity-50",
        disabled: "text-platform-muted opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => {
          if (orientation === "down") {
            return (
              <ChevronDown
                className={cn("h-3.5 w-3.5 text-platform-muted", chevronClassName)}
                {...chevronProps}
              />
            );
          }

          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return (
            <Icon
              className={cn("h-4 w-4 text-platform-muted", chevronClassName)}
              {...chevronProps}
            />
          );
        },
        ...(useDropdown ? { Dropdown: CalendarSelectDropdown } : {}),
        ...components,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
