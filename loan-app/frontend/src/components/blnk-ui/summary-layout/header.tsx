import type { ReactNode } from "react";

type HeaderProps = {
  title: string;
  accessory?: ReactNode;
};

export default function Header({ title, accessory }: HeaderProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-2">
      <h1 className="text-[22px] md:text-2xl font-pastiche font-semibold md:font-medium text-platform-primary-text leading-[125%] tracking-[-0.24px]">
        {title}
      </h1>
      {accessory ? (
        <span className="relative top-[0.12em] shrink-0">{accessory}</span>
      ) : null}
    </div>
  );
}
