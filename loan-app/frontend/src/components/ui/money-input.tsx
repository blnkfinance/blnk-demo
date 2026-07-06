"use client";

import { Input, type InputProps } from "@/components/ui/input";
import { formatMoneyInputDisplay } from "@/lib/format";

type MoneyInputProps = Omit<InputProps, "value" | "onChange" | "type" | "inputMode"> & {
  value: string;
  onChange: (value: string) => void;
};

export function MoneyInput({ value, onChange, ...props }: MoneyInputProps) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(formatMoneyInputDisplay(e.target.value))}
      {...props}
    />
  );
}
