"use client";

import TransactionAppliedIcon from "@/components/blnk-icons/transaction-applied-icon";
import TransactionVoidIcon from "@/components/blnk-icons/transaction-void-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProductStatus as ProductStatusValue } from "@/lib/products/types";

type ProductStatusProps = {
  status: ProductStatusValue;
  className?: string;
};

export default function ProductStatus({ status, className }: ProductStatusProps) {
  const normalized = status.toLowerCase() as ProductStatusValue;

  const icon =
    normalized === "active" ? (
      <TransactionAppliedIcon />
    ) : (
      <TransactionVoidIcon />
    );

  const textColor =
    normalized === "active"
      ? "text-platform-custom-green"
      : "text-platform-custom-purple-void";

  const tooltip =
    normalized === "active"
      ? "This product is available for new loans."
      : "This product is archived and not available for new loans.";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div
            className={`inline-flex items-center justify-start gap-1 rounded-full border border-platform-stroke bg-platform-main-bg px-2 py-1.5 ${className ?? ""}`}
          >
            {icon}
            <div className={`text-xs font-medium capitalize ${textColor}`}>
              {normalized}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent align="start" className="max-w-xs">
          <p className="text-sm leading-snug">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
