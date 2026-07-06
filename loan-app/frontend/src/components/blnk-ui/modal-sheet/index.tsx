"use client";

import GoBackArrow from "@/components/blnk-icons/go-back-arrow";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type ModalSheetProps = {
  show: boolean;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
};

export default function ModalSheet({
  show,
  onClose,
  onBack,
  children,
  className = "bg-platform-nav-bg",
  title,
}: ModalSheetProps) {
  const handleBack = onBack ?? onClose;

  return (
    <Sheet
      open={show}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        hideClose
        className={`${className} overflow-x-hidden overflow-y-auto sm:w-[520px] pt-8 px-4 sm:px-8`}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-platform-muted focus:outline-none"
        >
          <GoBackArrow className="h-4 w-4" />
          Go back
        </button>
        {children}
      </SheetContent>
    </Sheet>
  );
}
