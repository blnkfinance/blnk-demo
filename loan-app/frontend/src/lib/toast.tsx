"use client";

import { FailureToast, SuccessToast } from "@/components/blnk-ui/toasts";
import { toast } from "@/hooks/use-toast";

const TOAST_DURATION = 5000;
const DEFAULT_ERROR_DESCRIPTION = "Please try again.";

export function showSuccessToast(title: string, description: string) {
  toast({
    duration: TOAST_DURATION,
    description: <SuccessToast title={title} description={description} />,
  });
}

export function showErrorToast(title: string, description: string) {
  toast({
    duration: TOAST_DURATION,
    variant: "destructive",
    description: <FailureToast title={title} description={description} />,
  });
}

/** @deprecated Prefer showActionError for clearer title/description ordering. */
export function showApiError(message: string, title = "Something went wrong") {
  showErrorToast(title, message);
}

export function showActionError(opts: { action: string; message?: string }) {
  const summary = `Couldn't ${opts.action}.`;
  const detail = opts.message?.trim() || DEFAULT_ERROR_DESCRIPTION;
  showErrorToast(summary, detail);
}

export function showLoadError(resource: string, message?: string) {
  showActionError({ action: `load ${resource}`, message });
}
