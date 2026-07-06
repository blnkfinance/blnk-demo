import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "outline";
  size?: "default" | "sm";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        size === "default" && "h-9 px-4 py-2",
        size === "sm" && "h-8 px-3 text-xs",
        variant === "default" &&
          "bg-platform-button-main-bg text-platform-primary-text hover:bg-platform-button-main-bg/90",
        variant === "secondary" &&
          "border border-platform-stroke bg-platform-hover-bg text-platform-primary-text hover:bg-platform-hover-bg hover:opacity-90",
        variant === "outline" &&
          "border border-platform-stroke bg-transparent text-platform-primary-text hover:bg-platform-hover-bg",
        variant === "ghost" &&
          "text-platform-nav-text hover:bg-platform-hover-bg hover:text-platform-primary-text",
        className
      )}
      {...props}
    />
  );
}
