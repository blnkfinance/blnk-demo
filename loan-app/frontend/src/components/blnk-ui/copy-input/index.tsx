"use client";

import { Check } from "lucide-react";
import { useState, type KeyboardEvent, type MouseEvent } from "react";
import CopyIcon from "@/components/blnk-icons/copy-icon";
import { Input } from "@/components/ui/input";
import { navigateToCloud } from "@/lib/blnk-cloud-links";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

type CopyInputProps = {
  value: string;
  placeholder?: string;
  className?: string;
  fieldName?: string;
  compact?: boolean;
  href?: string;
};

export default function CopyInput({
  value,
  placeholder = "",
  className = "",
  fieldName = "default",
  compact = false,
  href,
}: CopyInputProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  async function handleCopy(text: string, field: string) {
    try {
      await copyToClipboard(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  }

  function handleNavigate() {
    if (href) {
      navigateToCloud(href);
    }
  }

  function handleContainerClick() {
    if (href) {
      handleNavigate();
      return;
    }
    void handleCopy(value, fieldName);
  }

  function handleCopyIconClick(event: MouseEvent) {
    event.stopPropagation();
    void handleCopy(value, fieldName);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    if (href) {
      handleNavigate();
      return;
    }
    void handleCopy(value, fieldName);
  }

  return (
    <div
      className="relative w-full cursor-pointer"
      onClick={handleContainerClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <Input
        value={value}
        placeholder={placeholder}
        readOnly
        className={`lining-nums tabular-nums bg-platform-main-bg rounded-lg cursor-pointer placeholder:text-platform-nav-text ${
          href ? "hover:underline" : ""
        } ${compact ? "h-8 py-1.5 pl-8 pr-2" : "h-10 py-2 pl-9"} ${className}`}
      />
      <div
        className={`absolute top-1/2 -translate-y-1/2 ${compact ? "left-2.5" : "left-3"}`}
        onClick={handleCopyIconClick}
        role="button"
        tabIndex={-1}
        aria-label="Copy"
      >
        {copiedField === fieldName ? (
          <Check className="h-[14px] w-[14px] text-green-500" />
        ) : (
          <CopyIcon
            color="#566873"
            className="h-[14px] w-[14px] cursor-pointer hover:opacity-80"
          />
        )}
      </div>
    </div>
  );
}
