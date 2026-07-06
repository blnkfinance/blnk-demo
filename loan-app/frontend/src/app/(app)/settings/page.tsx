"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import SectionHeader from "@/components/blnk-ui/section-header";
import { LedgerConfigurationSection } from "@/components/settings/ledger-config-section";
import { LoanEligibilitySection } from "@/components/settings/loan-eligibility-section";
import { BrandingSection } from "@/components/settings/branding-section";
import { SettingsSideNav } from "@/components/settings/settings-side-nav";
import type { SettingsSectionId } from "@/lib/settings/types";
import { SETTINGS_SECTIONS } from "@/lib/settings/types";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(
    SETTINGS_SECTIONS[0].id
  );

  const handleSectionSelect = useCallback((sectionId: SettingsSectionId) => {
    setActiveSection(sectionId);
    window.history.replaceState(null, "", `#${sectionId}`);
  }, []);

  useEffect(() => {
    function getScrollRoot(): Element | null {
      const isLargeScreen = window.matchMedia("(min-width: 1024px)").matches;
      if (isLargeScreen && contentScrollRef.current) {
        return contentScrollRef.current;
      }
      return document.querySelector("[data-main-scroll]");
    }

    const root = getScrollRoot();
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target.id) return;
        const sectionId = visible.target.id as SettingsSectionId;
        if (SETTINGS_SECTIONS.some((section) => section.id === sectionId)) {
          setActiveSection(sectionId);
        }
      },
      {
        root,
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 1],
      }
    );

    for (const section of SETTINGS_SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  if (!token) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-col lg:-mb-6 lg:h-[calc(100dvh-9.25rem+1.5rem)]">
      <div className="hidden">
        <SectionHeader
          title="Settings"
          subtitle="Configure loan management preferences for this workspace."
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,2fr)]">
        <div
          ref={contentScrollRef}
          className="min-w-0 space-y-16 lg:min-h-0 lg:overflow-y-auto lg:overscroll-y-contain"
        >
          <LedgerConfigurationSection key={token} token={token} />
          <LoanEligibilitySection key={`${token}-eligibility`} token={token} />
          <BrandingSection key={`${token}-branding`} token={token} />
        </div>
        <SettingsSideNav
          activeSection={activeSection}
          onSectionSelect={handleSectionSelect}
          scrollContainerRef={contentScrollRef}
        />
      </div>
    </div>
  );
}
