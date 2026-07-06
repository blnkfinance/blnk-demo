"use client";

import { useState, type ReactNode } from "react";
import CloseIcon from "@/components/blnk-icons/close-icon";
import WandIcon from "@/components/blnk-icons/wand-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PageNoticeProps = {
  message: string;
  docsHref?: string;
  docsLabel?: string;
  docsIcon?: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  onClose?: () => void;
};

export default function PageNotice({
  message,
  docsHref,
  docsLabel,
  docsIcon = <WandIcon />,
  className,
  defaultOpen = true,
  onClose,
}: PageNoticeProps) {
  const showDocsLink = Boolean(docsHref && docsLabel);
  const [open, setOpen] = useState(defaultOpen);

  function dismiss() {
    setOpen(false);
    onClose?.();
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "w-full rounded-md bg-platform-hover-bg px-3 py-2.5 sm:px-2.5 sm:py-1",
        showDocsLink
          ? "sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-2"
          : "flex items-center justify-between gap-2",
        className
      )}
    >
      {showDocsLink ? (
        <>
          <div className="relative flex items-center justify-center gap-2 sm:min-w-0 sm:flex-1 sm:justify-between">
            <p className="text-xs leading-5 text-platform-primary-text sm:text-sm">
              {message}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 p-0 text-platform-button-main-bg sm:hidden"
              onClick={dismiss}
              aria-label="Dismiss notice"
            >
              <CloseIcon />
            </Button>
          </div>

          <div className="mt-2 flex shrink-0 items-center gap-2 sm:mt-0">
            <a
              href={docsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-auto items-center gap-1.5 whitespace-nowrap px-0 py-1.5 text-xs font-semibold text-platform-button-main-bg sm:text-sm"
            >
              <span className="shrink-0">{docsIcon}</span>
              <span>{docsLabel}</span>
            </a>

            <Button
              size="sm"
              variant="ghost"
              className="hidden shrink-0 p-0 text-platform-button-main-bg sm:flex"
              onClick={dismiss}
              aria-label="Dismiss notice"
            >
              <CloseIcon />
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="min-w-0 text-xs leading-5 text-platform-primary-text sm:text-sm">
            {message}
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 p-0 text-platform-button-main-bg"
            onClick={dismiss}
            aria-label="Dismiss notice"
          >
            <CloseIcon />
          </Button>
        </>
      )}
    </div>
  );
}
