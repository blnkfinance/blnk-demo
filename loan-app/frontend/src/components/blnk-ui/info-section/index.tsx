import type { ReactNode } from "react";

export function InfoSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-[10px] font-pastiche text-platform-primary-text py-2 border-b border-platform-stroke font-medium leading-3 tracking-[0.5px] mb-[8px] uppercase">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6">{children}</div>
    </div>
  );
}

export function InfoField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h4 className="text-platform-primary-text font-semibold text-sm leading-[14px] mb-2">
        {label}
      </h4>
      <div className="text-platform-nav-text font-normal text-sm leading-[150%]">
        {children}
      </div>
    </div>
  );
}
