"use client";

import { useState } from "react";

type Props = {
  value: string;
  label?: string;
};

export default function CopyButton({ value, label = "Copy" }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`${label}: ${value}`}
      aria-label={`${label} ${value}`}
      className="inline-flex shrink-0 items-center justify-center rounded-md p-1 text-muted transition-colors hover:bg-bank/10 hover:text-bank"
    >
      {copied ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-success" aria-hidden>
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M7 3.5A1.5 1.5 0 018.5 2h6A1.5 1.5 0 0116 3.5v6a1.5 1.5 0 01-1.5 1.5h-6A1.5 1.5 0 017 9.5v-6z" />
          <path d="M4.5 6A1.5 1.5 0 003 7.5v6A1.5 1.5 0 004.5 15h6a1.5 1.5 0 001.5-1.5V12h-1.5a.75.75 0 01-.75-.75V9.5A2.5 2.5 0 008.5 7H6.5V7.5A1.5 1.5 0 015 9H4.5V6z" />
        </svg>
      )}
    </button>
  );
}
