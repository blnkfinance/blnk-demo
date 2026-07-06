import { cn } from "@/lib/utils";

type AppHeaderProps = {
  fixed?: boolean;
  className?: string;
};

export function AppHeader({ fixed = false, className }: AppHeaderProps) {
  const content = (
    <div className="mx-auto max-w-6xl px-4 pt-3 pb-0 sm:px-6">
      <h1 className="font-pastiche text-xl font-semibold leading-[26px] tracking-[-0.24px] text-platform-primary-text md:text-2xl md:leading-[30px]">
        Loan management
      </h1>
    </div>
  );

  if (fixed) {
    return (
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-10 bg-platform-nav-bg",
          className
        )}
      >
        {content}
      </header>
    );
  }

  return (
    <header
      className={cn("pointer-events-none invisible", className)}
      aria-hidden
    >
      {content}
    </header>
  );
}
