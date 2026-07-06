import * as React from "react";
import TransactionAppliedIcon from "@/components/blnk-icons/transaction-applied-icon";
import TransactionRejectedIcon from "@/components/blnk-icons/transaction-rejected-icon";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-[6px] border bg-platform-input-main-bg px-3 py-2 text-sm leading-none text-platform-primary-text placeholder:text-sm placeholder:text-platform-muted file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        error
          ? "border-platform-custom-red text-platform-primary-text"
          : "input-focus-shadow border-platform-input-border focus:border-platform-input-border-focus",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

const labelClassName =
  "text-platform-primary-text font-medium text-sm leading-none w-[120px] shrink-0 py-2";

export function FormRow({
  label,
  htmlFor,
  children,
  error,
  success,
  statusFeedback = false,
  required = false,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  error?: string;
  success?: string;
  statusFeedback?: boolean;
  required?: boolean;
}) {
  return (
    <div className="w-full space-y-1">
      <div className="flex flex-row items-center gap-x-4">
        <label htmlFor={htmlFor} className={labelClassName}>
          {label}
          {required ? (
            <span className="text-platform-custom-red" aria-hidden>
              {" "}
              *
            </span>
          ) : null}
        </label>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {error ? (
        <p className="flex items-center gap-1 pl-[136px] text-xs font-medium leading-4 text-platform-custom-red">
          {statusFeedback ? (
            <TransactionRejectedIcon className="shrink-0" aria-hidden />
          ) : null}
          {error}
        </p>
      ) : success ? (
        <p className="flex items-center gap-1 pl-[136px] text-xs font-medium leading-4 text-platform-custom-green">
          {statusFeedback ? (
            <TransactionAppliedIcon className="shrink-0" aria-hidden />
          ) : null}
          {success}
        </p>
      ) : null}
    </div>
  );
}

export function FormReadOnlyRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <div className="flex flex-row items-center gap-x-4">
        <span className={labelClassName}>{label}</span>
        <div className="flex-1 min-w-0 text-sm text-platform-primary-text">{value}</div>
      </div>
    </div>
  );
}
