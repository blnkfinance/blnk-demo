"use client";

import React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

function toCardLabel(columnId: string): string {
  return columnId
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function sumFixedColumnWidths<TData>(cols: ColumnDef<TData, unknown>[]): number {
  return cols.reduce((sum, col) => {
    const width = (col as ColumnDef<TData> & { width?: string }).width;
    if (width?.endsWith("px")) {
      return sum + Number.parseInt(width, 10);
    }
    return sum;
  }, 0);
}

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  onSelect?: (row: TData) => void;
  onRowHover?: (row: TData) => void;
  onRowLeave?: () => void;
  currentPage?: number;
  pageSize?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageHover?: (page: number) => void;
  onPageLeave?: () => void;
  totalItems?: number;
  startNumber?: number;
  endNumber?: number;
  renderActions?: (row: TData) => React.ReactNode;
  actionsHeaderLabel?: string;
  stickyActionsRight?: boolean;
  contentBasedWidths?: boolean;
  fixedWidths?: boolean;
  lastColumnFill?: boolean;
  getRowId?: (originalRow: TData, index: number) => string;
  onCellClick?: (
    row: TData,
    columnId: string,
    value: unknown,
    event?: React.MouseEvent
  ) => void;
  renderMobileCard?: (row: TData) => React.ReactNode;
  cellPaddingClassName?: string;
  /** Cap tbody scroll area height (e.g. `min(60vh, calc(100dvh - 14rem))`) and keep thead fixed. */
  scrollBody?: boolean;
  bodyMaxHeight?: string;
};

export function DataTable<TData>({
  columns,
  data,
  onSelect,
  onRowHover,
  onRowLeave,
  currentPage,
  totalPages,
  onPageChange,
  onPageHover,
  onPageLeave,
  renderActions,
  actionsHeaderLabel = " ",
  stickyActionsRight = true,
  totalItems,
  startNumber,
  endNumber,
  contentBasedWidths = false,
  fixedWidths = false,
  lastColumnFill = false,
  getRowId,
  onCellClick,
  renderMobileCard,
  cellPaddingClassName = "py-2",
  scrollBody = false,
  bodyMaxHeight,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(getRowId ? { getRowId } : {}),
  });

  const hasActions = Boolean(renderActions);
  const scrollHeaderCellClass = scrollBody ? "bg-platform-nav-bg" : "";
  const bodyScrollStyle =
    scrollBody && bodyMaxHeight ? { maxHeight: bodyMaxHeight } : undefined;
  const fixedTableMinWidth =
    scrollBody && fixedWidths ? sumFixedColumnWidths(columns) : 0;
  const tableStyle =
    scrollBody && fixedTableMinWidth > 0
      ? { minWidth: `${fixedTableMinWidth}px` }
      : scrollBody
        ? undefined
        : { borderSpacing: "0 4px" };
  const tableWidthClass =
    scrollBody && fixedTableMinWidth > 0 ? "" : "w-full";

  const paginationFooter =
    totalPages && totalPages > 1 ? (
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mt-4">
        <p className="text-xs text-platform-muted-secondary font-medium self-center">
          {startNumber} - {endNumber} of {totalItems?.toLocaleString()}
          {totalItems === 1 ? " result" : " results"}
        </p>

        <div className="flex items-center gap-x-2">
          <Button
            size="sm"
            onClick={() =>
              onPageChange && onPageChange(Math.max((currentPage || 1) - 1, 1))
            }
            onMouseEnter={() =>
              onPageHover && onPageHover(Math.max((currentPage || 1) - 1, 1))
            }
            onMouseLeave={() => onPageLeave && onPageLeave()}
            disabled={(currentPage || 1) === 1}
            className="px-2 py-1 border rounded-md disabled:opacity-50 bg-platform-hover-bg border-platform-stroke font-medium text-platform-button-text-color"
          >
            Previous
          </Button>

          <Button
            size="sm"
            onClick={() =>
              onPageChange &&
              onPageChange(Math.min((currentPage || 1) + 1, totalPages))
            }
            onMouseEnter={() =>
              onPageHover &&
              onPageHover(Math.min((currentPage || 1) + 1, totalPages))
            }
            onMouseLeave={() => onPageLeave && onPageLeave()}
            disabled={(currentPage || 1) === totalPages}
            className="px-2 py-1 border rounded-md disabled:opacity-50 bg-platform-hover-bg border-platform-stroke font-medium text-platform-button-text-color"
          >
            Next
          </Button>
        </div>
      </div>
    ) : null;

  return (
    <div className="w-full text-sm">
      <div className={`hidden md:block ${scrollBody ? "" : "overflow-x-auto"}`}>
        <div
          className={scrollBody ? "overflow-auto" : undefined}
          style={bodyScrollStyle}
        >
        <table
          className={`border-b border-platform-stroke ${tableWidthClass} ${
            scrollBody ? "border-collapse" : "border-separate"
          } ${contentBasedWidths || fixedWidths ? "table-fixed" : ""}`}
          style={tableStyle}
        >
          <thead
            className={
              scrollBody
                ? "sticky -top-[1.5px] z-10 isolate bg-platform-nav-bg shadow-[0_4px_0_0_var(--platform-nav-bg)]"
                : undefined
            }
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => {
                  const isLastColumn =
                    index === headerGroup.headers.length - 1 && !hasActions;
                  const shouldFillLast =
                    lastColumnFill && fixedWidths && isLastColumn;
                  const headerMeta = (
                    header.column.columnDef as ColumnDef<TData> & {
                      meta?: { align?: "left" | "right" };
                    }
                  ).meta;
                  const headerAlign =
                    headerMeta?.align === "right" ? "text-right" : "text-left";

                  return (
                    <th
                      key={header.id}
                      className={`${headerAlign} ${scrollHeaderCellClass} text-[10px] tracking-[0.5px] font-medium leading-3 text-platform-primary-text font-pastiche py-3 ${scrollBody ? "" : "mb-1.5"} border-b border-platform-stroke uppercase ${
                        contentBasedWidths || fixedWidths
                          ? "whitespace-nowrap"
                          : ""
                      } ${index === 0 ? "pl-2 pr-4" : ""} ${
                        index > 0 && index < headerGroup.headers.length - 1
                          ? "px-4"
                          : ""
                      } ${
                        index === headerGroup.headers.length - 1 && !hasActions
                          ? "pl-4 pr-2"
                          : ""
                      } ${
                        index === headerGroup.headers.length - 1 && hasActions
                          ? "pl-4 pr-2"
                          : ""
                      }`}
                      style={
                        shouldFillLast
                          ? { width: "auto" }
                          : (contentBasedWidths || fixedWidths) &&
                              (
                                header.column.columnDef as ColumnDef<TData> & {
                                  width?: string;
                                }
                              ).width
                            ? {
                                width: (
                                  header.column.columnDef as ColumnDef<TData> & {
                                    width?: string;
                                  }
                                ).width,
                              }
                            : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  );
                })}
                {hasActions ? (
                  <th
                    className={[
                      "text-right text-xs font-medium uppercase tracking-wide border-b border-platform-stroke pl-4 pr-2",
                      scrollHeaderCellClass,
                      stickyActionsRight ? "sticky right-0 bg-platform-bg" : "",
                    ].join(" ")}
                  >
                    {actionsHeaderLabel}
                  </th>
                ) : null}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  className="text-center py-6 text-platform-muted"
                >
                  No data to display
                </td>
              </tr>
            ) : null}

            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={
                  onSelect
                    ? "hover:bg-platform-hover-bg hover:rounded cursor-pointer"
                    : ""
                }
                onClick={(e) => {
                  if (!e.defaultPrevented && onSelect) {
                    onSelect(row.original);
                  }
                }}
                onMouseEnter={() => onRowHover && onRowHover(row.original)}
                onMouseLeave={() => onRowLeave && onRowLeave()}
              >
                {row.getVisibleCells().map((cell, index) => {
                  const cellValue = cell.getValue();
                  const columnId = cell.column.id;
                  const isLastColumn =
                    index === row.getVisibleCells().length - 1 && !hasActions;
                  const shouldFillLast =
                    lastColumnFill && fixedWidths && isLastColumn;
                  const columnWidth = (
                    cell.column.columnDef as ColumnDef<TData> & {
                      width?: string;
                    }
                  ).width;

                  const columnMeta = (
                    cell.column.columnDef as ColumnDef<TData> & {
                      meta?: { disableTruncate?: boolean; align?: "left" | "right" };
                    }
                  ).meta;
                  const disableTruncate = columnMeta?.disableTruncate === true;
                  const cellAlign =
                    columnMeta?.align === "right" ? "text-right" : "";

                  return (
                    <td
                      key={cell.id}
                      className={`text-platform-primary-text ${cellPaddingClassName} text-sm leading-[16px] ${
                        contentBasedWidths || fixedWidths
                          ? "whitespace-nowrap"
                          : ""
                      } ${
                        contentBasedWidths || fixedWidths
                          ? !disableTruncate
                            ? "overflow-hidden text-ellipsis"
                            : ""
                          : ""
                      } ${index === 0 ? "rounded-l pl-2 pr-4" : ""} ${
                        index > 0 && index < row.getVisibleCells().length - 1
                          ? "px-4"
                          : ""
                      } ${
                        index === row.getVisibleCells().length - 1 &&
                        !hasActions
                          ? "rounded-r pl-4 pr-2"
                          : ""
                      } ${
                        index === row.getVisibleCells().length - 1 && hasActions
                          ? "pl-4 pr-2"
                          : ""
                      } ${cellAlign} ${onCellClick ? "cursor-pointer" : ""}`}
                      style={
                        shouldFillLast
                          ? { width: "auto" }
                          : (contentBasedWidths || fixedWidths) && columnWidth
                            ? { width: columnWidth }
                            : undefined
                      }
                      onClick={(e) => {
                        if (onCellClick) {
                          onCellClick(row.original, columnId, cellValue, e);
                          if (e.defaultPrevented) {
                            e.stopPropagation();
                          }
                        }
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}

                {hasActions ? (
                  <td
                    className={[
                      `text-right rounded-r pl-4 pr-2 ${cellPaddingClassName}`,
                      stickyActionsRight ? "sticky right-0 bg-inherit" : "",
                    ].join(" ")}
                  >
                    <div className="flex justify-end">
                      {renderActions?.(row.original)}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div
        className={`md:hidden space-y-2${scrollBody ? " overflow-y-auto" : ""}`}
        style={bodyScrollStyle}
      >
        {table.getRowModel().rows.length === 0 ? (
          <p className="text-center py-6 text-platform-muted text-sm">
            No data to display
          </p>
        ) : null}

        {table.getRowModel().rows.map((row) => (
          <div
            key={row.id}
            className={`rounded-lg border border-platform-stroke bg-platform-main-bg p-3 ${
              onSelect ? "cursor-pointer active:bg-platform-hover-bg" : ""
            }`}
            onClickCapture={(e) => {
              if (e.button !== 0) return;
              onSelect?.(row.original);
            }}
          >
            {renderMobileCard ? (
              renderMobileCard(row.original)
            ) : (
              <div className="space-y-2.5">
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className="flex items-start justify-between gap-3 min-w-0"
                  >
                    <span className="flex-shrink-0 text-[10px] font-medium uppercase tracking-[0.5px] text-platform-muted mt-0.5 min-w-[72px]">
                      {toCardLabel(cell.column.id)}
                    </span>
                    <div className="flex-1 flex justify-end text-sm text-platform-primary-text min-w-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {paginationFooter}
    </div>
  );
}
