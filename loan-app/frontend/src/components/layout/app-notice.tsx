"use client";

import { useState } from "react";
import PageNotice from "@/components/blnk-ui/page-notice";

export function AppNotice() {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  return (
    <div className="w-full bg-platform-hover-bg">
      <PageNotice
        className="mx-auto max-w-6xl rounded-none bg-transparent px-4 py-1.5 sm:px-6 sm:py-1.5"
        message="Configure, review, and manage loan applications for customers."
        onClose={() => setVisible(false)}
      />
    </div>
  );
}
