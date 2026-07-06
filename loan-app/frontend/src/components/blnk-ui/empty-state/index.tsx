import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionButton?: {
    text: string;
    onClick: () => void;
  };
  className?: string;
  maxWidth?: string;
  paddingTop?: string;
};

export default function EmptyState({
  icon,
  title,
  description,
  actionButton,
  className = "",
  maxWidth = "max-w-[320px]",
  paddingTop = "pt-16",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${paddingTop} ${className}`}
    >
      {icon ? (
        <div className="flex items-center border border-platform-stroke bg-platform-main-bg w-[52px] h-[52px] rounded-full justify-center mb-4">
          {icon}
        </div>
      ) : null}

      <div className={`text-center ${maxWidth}`}>
        <h3 className="text-platform-primary-text tracking-[-0.14px] font-pastiche text-sm font-medium mb-2 leading-[125%]">
          {title}
        </h3>
        {description ? (
          <p className="text-platform-muted text-sm mb-4 leading-[20px]">
            {description}
          </p>
        ) : null}
        {actionButton ? (
          <Button
            onClick={actionButton.onClick}
            className="bg-platform-button-main-bg hover:bg-platform-button-text-button/90 text-platform-primary-text leading-4 font-medium px-2 py-1.5 h-auto rounded-[6px] text-sm gap-1.5"
          >
            {actionButton.text}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
