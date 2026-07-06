"use client";

import { formatDisplayDateTime, formatTableDate } from "@/lib/format";

type FormattedDateProps = {
  value: string | null | undefined;
  fallback?: string;
  className?: string;
  showTime?: boolean;
};

export default function FormattedDate({
  value,
  fallback = "-",
  className = "",
  showTime = false,
}: FormattedDateProps) {
  if (value == null || value === "") {
    return <span className={className}>{fallback}</span>;
  }

  const formatted = showTime ? formatDisplayDateTime(value) : formatTableDate(value);

  return <span className={`numeric-value ${className}`.trim()}>{formatted}</span>;
}
