"use client";

import { useCallback, useEffect, type RefObject } from "react";
import LedgerIcon from "@/components/blnk-icons/ledger-icon";
import ListCheckIcon from "@/components/blnk-icons/list-check-icon";
import WandIcon from "@/components/blnk-icons/wand-icon";
import { SETTINGS_SECTIONS, type SettingsSectionId } from "@/lib/settings/types";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Partial<
  Record<SettingsSectionId, typeof LedgerIcon>
> = {
  "ledger-configuration": LedgerIcon,
  "loan-eligibility": ListCheckIcon,
  branding: WandIcon,
};

type SettingsSideNavProps = {
  activeSection: SettingsSectionId;
  onSectionSelect: (sectionId: SettingsSectionId) => void;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
};

export function SettingsSideNav({
  activeSection,
  onSectionSelect,
  scrollContainerRef,
}: SettingsSideNavProps) {
  const handleClick = useCallback(
    (sectionId: SettingsSectionId) => {
      onSectionSelect(sectionId);
      const target = document.getElementById(sectionId);
      if (!target) return;

      const container = scrollContainerRef?.current;
      const isLargeScreen = window.matchMedia("(min-width: 1024px)").matches;
      if (isLargeScreen && container) {
        const containerTop = container.getBoundingClientRect().top;
        const targetTop = target.getBoundingClientRect().top;
        container.scrollTo({
          top: container.scrollTop + targetTop - containerTop,
          behavior: "smooth",
        });
        return;
      }

      target.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [onSectionSelect, scrollContainerRef]
  );

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (
      SETTINGS_SECTIONS.some((section) => section.id === hash) &&
      hash !== activeSection
    ) {
      onSectionSelect(hash as SettingsSectionId);
    }
  }, [activeSection, onSectionSelect]);

  return (
    <aside className="relative lg:h-full lg:shrink-0">
      <div className="pl-6">
        <nav aria-label="Settings sections" className="space-y-0">
          {SETTINGS_SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            const Icon = SECTION_ICONS[section.id];

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleClick(section.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md p-2 text-left text-sm font-medium leading-4 transition-colors duration-300 ease-in-out hover:bg-platform-hover-bg",
                  isActive
                    ? "text-platform-button-main-bg"
                    : "text-platform-muted-secondary hover:text-platform-nav-text"
                )}
              >
                {Icon ? (
                  <Icon className="h-4 w-4 shrink-0" fill="currentColor" />
                ) : null}
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
