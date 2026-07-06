import EmptyState from "@/components/blnk-ui/empty-state";
import CircleInfoIcon from "@/components/blnk-icons/circle-info-icon";

type ViewportGateProps = {
  children: React.ReactNode;
};

export function ViewportGate({ children }: ViewportGateProps) {
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-platform-main-bg px-4 lg:hidden">
        <EmptyState
          icon={<CircleInfoIcon width={20} height={20} />}
          title="Expand your view"
          description="Your viewport is too small. Expand the panel to use the product properly."
          maxWidth="max-w-[230px]"
          paddingTop="pt-0"
        />
      </div>
      <div className="hidden h-dvh lg:block">{children}</div>
    </>
  );
}
