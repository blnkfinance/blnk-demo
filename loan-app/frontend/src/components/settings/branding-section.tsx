"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import EditIcon from "@/components/blnk-icons/edit-icon";
import StackIcon from "@/components/blnk-icons/stack-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchBrandingSettings,
  patchBrandingSettings,
} from "@/lib/settings/api";
import {
  applyBrandingPrimaryColor,
  isValidBrandingPrimaryColor,
  resolveBrandingPrimaryColor,
} from "@/lib/branding";
import { showActionError } from "@/lib/toast";
import { cn } from "@/lib/utils";

type BrandingSectionProps = {
  token: string;
};

export function BrandingSection({ token }: BrandingSectionProps) {
  const [primaryColor, setPrimaryColor] = useState("");
  const [draftColor, setDraftColor] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchBrandingSettings(token).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPrimaryColor(result.settings.primary_color);
      setDraftColor(result.settings.primary_color);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function handleEdit() {
    setDraftColor(primaryColor);
    setFieldError(null);
    setEditing(true);
  }

  async function handleSave() {
    const trimmed = draftColor.trim();
    if (!isValidBrandingPrimaryColor(trimmed)) {
      setFieldError("Enter a valid hex colour, for example #0979C6.");
      return;
    }

    const normalized = resolveBrandingPrimaryColor(trimmed);
    setSaving(true);
    setFieldError(null);
    setError(null);

    const result = await patchBrandingSettings(token, {
      primary_color: normalized,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      showActionError({
        action: "save branding settings",
        message: result.message,
      });
      return;
    }

    applyBrandingPrimaryColor(normalized, { token });
    window.location.reload();
  }

  return (
    <section id="branding" className="scroll-mt-6 space-y-4">
      <div className="space-y-2">
        <h2 className="font-pastiche text-lg font-semibold leading-[125%] tracking-[-0.18px] text-platform-primary-text">
          Branding
        </h2>
        <p className="text-sm leading-[150%] text-platform-muted">
          Set the primary accent colour used across buttons, links, and
          navigation in this workspace.
        </p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-platform-muted">
          Loading branding settings…
        </div>
      ) : error && !primaryColor ? (
        <p className="text-sm text-platform-muted">{error}</p>
      ) : (
        <div className="w-full">
          <div className="flex flex-row items-center gap-x-4 border-b border-platform-stroke pb-2">
            <span className="w-[280px] shrink-0 py-2 pl-2 text-[10px] font-pastiche font-medium uppercase leading-3 tracking-[0.5px] text-platform-primary-text">
              Setting
            </span>
            <span className="flex-1 py-2 pl-4 text-[10px] font-pastiche font-medium uppercase leading-3 tracking-[0.5px] text-platform-primary-text">
              Value
            </span>
          </div>

          <div className="mt-3 flex flex-row items-start gap-x-4">
            <div className="flex w-[280px] shrink-0 items-center pl-2">
              <span className="text-sm font-medium text-platform-primary-text">
                Primary colour
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-2 pl-4">
              <div className="relative w-full min-w-0">
                <Input
                  value={editing ? draftColor : primaryColor}
                  readOnly={!editing}
                  onChange={(event) => {
                    setDraftColor(event.target.value);
                    setFieldError(null);
                  }}
                  placeholder="#0979C6"
                  spellCheck={false}
                  autoComplete="off"
                  error={Boolean(fieldError)}
                  className={cn(
                    "w-full pr-24 font-mono",
                    !editing && "cursor-default"
                  )}
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={
                    fieldError ? "branding-primary-color-error" : undefined
                  }
                />
                <Button
                  type="button"
                  variant={editing ? "default" : "secondary"}
                  aria-busy={saving}
                  className={cn(
                    "absolute right-1 top-1/2 h-8 -translate-y-1/2 shrink-0 gap-1.5 px-2 text-sm font-medium leading-4",
                    editing
                      ? "border-0 bg-platform-button-main-bg text-platform-button-text-color hover:bg-platform-button-main-bg/90"
                      : "text-platform-button-text-color",
                    saving && "pointer-events-none"
                  )}
                  disabled={saving}
                  onClick={() => {
                    if (editing) {
                      void handleSave();
                      return;
                    }
                    handleEdit();
                  }}
                >
                  {editing ? (
                    saving ? (
                      <>
                        <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <StackIcon
                          className="h-3.5 w-3.5 shrink-0"
                          fill="var(--platform-button-text-color)"
                        />
                        Save
                      </>
                    )
                  ) : (
                    <>
                      <EditIcon className="h-3.5 w-3.5 shrink-0 text-platform-muted" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
              {fieldError ? (
                <p
                  id="branding-primary-color-error"
                  className="text-sm text-platform-custom-red"
                >
                  {fieldError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {error && primaryColor ? (
        <p className="text-sm text-platform-muted">{error}</p>
      ) : null}
    </section>
  );
}
