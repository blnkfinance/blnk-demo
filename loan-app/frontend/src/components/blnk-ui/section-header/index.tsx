import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  count?: number | string;
  rightContent?: ReactNode;
};

export default function SectionHeader({
  title,
  subtitle,
  count,
  rightContent,
}: SectionHeaderProps) {
  return (
    <div className="border-b border-platform-stroke pb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center space-x-1">
          <h2 className="font-pastiche text-lg font-semibold leading-[125%] tracking-[-0.18px] text-platform-primary-text">
            {title}
          </h2>
          {count !== undefined && count !== null ? (
            <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-platform-main-bg px-1 text-[10px] leading-none text-platform-muted">
              {count}
            </div>
          ) : null}
        </div>
        {rightContent ? <div className="shrink-0">{rightContent}</div> : null}
      </div>
      {subtitle ? (
        <p className="mt-1 text-sm leading-normal text-platform-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}
