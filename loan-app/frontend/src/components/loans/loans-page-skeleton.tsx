import { Skeleton } from "@/components/ui/skeleton";

const TABLE_HEADERS = [
  { label: "Customer", width: "200px", align: "left" as const },
  { label: "Principal", width: "140px", align: "right" as const },
  { label: "Net disbursement", width: "160px", align: "right" as const },
  { label: "Term", width: "80px", align: "left" as const },
  { label: "First payment", width: "130px", align: "left" as const },
  { label: "Status", width: "140px", align: "left" as const },
  { label: "Created", width: "180px", align: "left" as const },
];

const ROW_COUNT = 8;

function ToolbarSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-nowrap gap-2 overflow-x-auto scrollbar-hide">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-[7.5rem] shrink-0 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-8 w-[7.25rem] shrink-0 rounded-md" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="hidden w-full text-sm md:block">
      <table className="w-full table-fixed border-separate border-b border-platform-stroke">
        <thead>
          <tr>
            {TABLE_HEADERS.map((header, index) => (
              <th
                key={header.label}
                className={`border-b border-platform-stroke py-3 text-[10px] font-medium uppercase leading-3 tracking-[0.5px] text-platform-primary-text font-pastiche ${
                  header.align === "right" ? "text-right" : "text-left"
                } ${index === 0 ? "pl-2 pr-4" : "px-4"}`}
                style={{ width: header.width }}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: ROW_COUNT }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-platform-stroke">
              {TABLE_HEADERS.map((header, colIndex) => (
                <td
                  key={header.label}
                  className={`py-1.5 ${colIndex === 0 ? "pl-2 pr-4" : "px-4"}`}
                >
                  <Skeleton
                    className={`h-4 ${
                      colIndex === 0
                        ? "w-28"
                        : colIndex === 5
                          ? "h-5 w-24 rounded-full"
                          : colIndex === 6
                            ? "w-36"
                            : "w-16"
                    } ${header.align === "right" ? "ml-auto" : ""}`}
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

function MobileTableSkeleton() {
  return (
    <div className="space-y-3 md:hidden">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-lg border border-platform-stroke p-3"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function LoanTableSkeleton() {
  return (
    <>
      <TableSkeleton />
      <MobileTableSkeleton />
    </>
  );
}

export function LoansPageSkeleton() {
  return (
    <div className="space-y-4">
      <ToolbarSkeleton />
      <LoanTableSkeleton />
    </div>
  );
}
