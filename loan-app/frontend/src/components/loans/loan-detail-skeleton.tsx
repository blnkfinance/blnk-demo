import { Skeleton } from "@/components/ui/skeleton";

const SCHEDULE_HEADERS = [
  { width: "130px", align: "left" as const },
  { width: "140px", align: "right" as const },
  { width: "140px", align: "right" as const },
  { width: "140px", align: "right" as const },
  { width: "140px", align: "right" as const },
  { width: "140px", align: "right" as const },
];

const SCHEDULE_ROW_COUNT = 6;

function MetricFieldSkeleton() {
  return (
    <div>
      <Skeleton className="mb-2 h-[14px] w-24" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

function ScheduleTableSkeleton() {
  return (
    <div className="w-full overflow-x-auto text-sm">
      <table className="w-full table-fixed border-separate border-b border-platform-stroke">
        <thead>
          <tr>
            {SCHEDULE_HEADERS.map((header, index) => (
              <th
                key={index}
                className={`border-b border-platform-stroke py-3 text-[10px] font-medium uppercase leading-3 tracking-[0.5px] text-platform-primary-text font-pastiche ${
                  header.align === "right" ? "text-right" : "text-left"
                } ${index === 0 ? "pl-2 pr-4" : "px-4"}`}
                style={{ width: header.width }}
              >
                <Skeleton
                  className={`h-3 ${header.align === "right" ? "ml-auto" : ""} w-20`}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: SCHEDULE_ROW_COUNT }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-platform-stroke">
              {SCHEDULE_HEADERS.map((header, colIndex) => (
                <td
                  key={colIndex}
                  className={`py-1.5 ${colIndex === 0 ? "pl-2 pr-4" : "px-4"}`}
                >
                  <Skeleton
                    className={`h-4 w-16 ${header.align === "right" ? "ml-auto" : ""}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SidebarSectionSkeleton({
  fieldCount,
  divider = false,
}: {
  fieldCount: number;
  divider?: boolean;
}) {
  return (
    <section
      className={`space-y-4 ${divider ? "border-b border-platform-stroke pb-10" : ""}`}
    >
      <Skeleton className="h-6 w-24" />
      <div className="space-y-6">
        {Array.from({ length: fieldCount }).map((_, index) => (
          <MetricFieldSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

function LoanDetailMainSkeleton() {
  return (
    <div className="min-w-0">
      <section className="space-y-6 pb-8">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <Skeleton className="h-8 w-40 sm:h-8 sm:w-52" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 w-28 shrink-0 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <MetricFieldSkeleton key={index} />
          ))}
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <div className="space-y-1 border-b border-platform-stroke pb-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <MetricFieldSkeleton key={index} />
          ))}
        </div>
      </section>

      <section className="mt-16 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <ScheduleTableSkeleton />
      </section>

      <section className="mt-16 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
        <ScheduleTableSkeleton />
      </section>
    </div>
  );
}

function LoanDetailSidebarSkeleton() {
  return (
    <aside className="space-y-10">
      <SidebarSectionSkeleton fieldCount={8} divider />
      <SidebarSectionSkeleton fieldCount={3} />
    </aside>
  );
}

export function LoanDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,2fr)]">
      <LoanDetailMainSkeleton />
      <LoanDetailSidebarSkeleton />
    </div>
  );
}
