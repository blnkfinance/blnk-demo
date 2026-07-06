"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import ChevronDownFull from "@/components/blnk-icons/chevron-down-full";
import EllipsisHorizontalIcon from "@/components/blnk-icons/ellipsis-horizontal-icon";
import { Button } from "@/components/ui/button";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import {
  getDropdownPosition,
  getSubmenuPosition as getSubmenuPositionUtil,
} from "@/lib/dropdown-position";
import { cn } from "@/lib/utils";

export type ActionsDropdownItem = {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  subItems?: ActionsDropdownItem[];
};

type ActionsDropdownProps = {
  id?: string | number;
  items: ActionsDropdownItem[];
  isBusy?: boolean;
  busyItemKey?: string | null;
  menuAlign?: "left" | "right";
  trigger?: "actions" | "ellipsis";
  triggerClassName?: string;
};

export function ActionsDropdown({
  id,
  items,
  isBusy = false,
  busyItemKey = null,
  menuAlign = "left",
  trigger = "actions",
  triggerClassName,
}: ActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubmenuKey, setOpenSubmenuKey] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    openAbove?: boolean;
  }>({ left: 0 });
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const submenuScrollRef = useRef<HTMLDivElement>(null);
  const [showSubmenuScrollShade, setShowSubmenuScrollShade] = useState(false);
  const openTimeRef = useRef(0);

  useScrollLock(isOpen, dropdownRef);

  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (Date.now() - openTimeRef.current < 100) return;

      const target = event.target as Node;

      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return;
      }

      const dropdownElements = document.querySelectorAll("[data-dropdown-menu]");
      let clickedInsideDropdown = false;
      Array.from(dropdownElements).forEach((element) => {
        if (element.contains(target)) {
          clickedInsideDropdown = true;
        }
      });

      if (!clickedInsideDropdown) {
        setIsOpen(false);
        setOpenSubmenuKey(null);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setOpenSubmenuKey(null);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!openSubmenuKey) {
      setShowSubmenuScrollShade(false);
      return;
    }
    const container = submenuScrollRef.current;
    if (!container) return;

    const checkScrollability = () => {
      const hasScroll = container.scrollHeight > container.clientHeight;
      const isAtBottom =
        container.scrollHeight - container.scrollTop <=
        container.clientHeight + 5;
      setShowSubmenuScrollShade(hasScroll && !isAtBottom);
    };

    checkScrollability();
    container.addEventListener("scroll", checkScrollability);
    window.addEventListener("resize", checkScrollability);
    return () => {
      container.removeEventListener("scroll", checkScrollability);
      window.removeEventListener("resize", checkScrollability);
    };
  }, [openSubmenuKey, items]);

  const handleItemClick = async (
    item: ActionsDropdownItem,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (item.subItems && item.subItems.length > 0) {
      setOpenSubmenuKey(openSubmenuKey === item.key ? null : item.key);
      return;
    }

    setIsOpen(false);
    setOpenSubmenuKey(null);

    if (item.onClick) {
      setTimeout(async () => {
        try {
          await item.onClick!();
        } catch (error) {
          console.error("Dropdown item action failed:", error);
        }
      }, 10);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !isOpen &&
      dropdownRef.current &&
      dropdownRef.current instanceof HTMLElement
    ) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPosition(
        getDropdownPosition(rect, {
          menuWidth: trigger === "ellipsis" ? 207 : 200,
          gap: 8,
          align: menuAlign,
        })
      );
    }
    setIsOpen(!isOpen);
    if (!isOpen) {
      setOpenSubmenuKey(null);
    }
  };

  const getSubmenuPosition = (itemKey: string) => {
    const itemElement = itemRefs.current.get(itemKey);
    if (!itemElement || !(itemElement instanceof HTMLElement))
      return { top: 0, left: 0 };
    const rect = itemElement.getBoundingClientRect();
    return getSubmenuPositionUtil(rect, {
      submenuWidth: 200,
      submenuMaxHeight: 320,
      gap: 4,
    });
  };

  const renderDropdownItem = (item: ActionsDropdownItem, isSubItem = false) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isSubmenuOpen = openSubmenuKey === item.key;

    return (
      <div
        key={item.key}
        ref={(el) => {
          if (el) {
            itemRefs.current.set(item.key, el);
          } else {
            itemRefs.current.delete(item.key);
          }
        }}
        className="relative"
      >
        <Button
          variant="ghost"
          className={`button flex w-full cursor-pointer items-center justify-between bg-platform-nav-bg px-3 py-2 text-left text-sm text-platform-primary-text hover:bg-platform-hover-bg hover:opacity-100 focus:bg-platform-hover-bg focus:outline-none ${
            isSubItem ? "pl-6" : ""
          } ${isSubmenuOpen ? "bg-platform-hover-bg" : ""}`}
          disabled={isBusy || busyItemKey === item.key || item.disabled}
          onClick={(e) => handleItemClick(item, e)}
        >
          <span className="flex items-center">
            {item.icon || busyItemKey === item.key ? (
              <span className="mr-2 flex h-4 w-4 shrink-0 items-center justify-center text-platform-muted [&_svg]:h-4 [&_svg]:w-4">
                {busyItemKey === item.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  item.icon
                )}
              </span>
            ) : null}
            <span>{item.label}</span>
          </span>
          {hasSubItems ? (
            <ChevronRight className="ml-3 h-3 w-3 text-platform-muted" />
          ) : null}
        </Button>
      </div>
    );
  };

  return (
    <div className="relative flex justify-end" ref={dropdownRef}>
      {trigger === "ellipsis" ? (
        <Button
          size="sm"
          className={cn(
            "flex h-7 min-h-7 w-7 min-w-7 items-center justify-center rounded-md border border-platform-stroke bg-platform-nav-bg p-0 text-platform-muted hover:text-platform-primary-text",
            triggerClassName
          )}
          data-session-id={id}
          disabled={isBusy}
          onClick={handleToggle}
        >
          {isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <EllipsisHorizontalIcon className="h-4 w-4 shrink-0" />
          )}
        </Button>
      ) : (
        <Button
          className="h-8 rounded-md border border-platform-stroke bg-platform-hover-bg px-2 text-sm font-medium leading-4 text-platform-button-text-color"
          data-session-id={id}
          disabled={isBusy}
          onClick={handleToggle}
        >
          Actions
          <ChevronDownFull className={`ml-1.5 ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      )}

      {isOpen &&
        createPortal(
          <div
            data-dropdown-menu
            className="fixed z-[9999] min-w-[200px] rounded-md border border-platform-input-border bg-platform-nav-bg py-1 shadow-lg"
            style={{
              width: trigger === "ellipsis" ? 207 : undefined,
              ...(dropdownPosition.openAbove
                ? {
                    bottom: dropdownPosition.bottom,
                    left: dropdownPosition.left,
                  }
                : {
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                  }),
            }}
          >
            {items.map((item) => renderDropdownItem(item))}
          </div>,
          document.body
        )}

      {isOpen &&
        items.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isSubmenuOpen = openSubmenuKey === item.key;
          const submenuPosition =
            hasSubItems && isSubmenuOpen ? getSubmenuPosition(item.key) : null;

          if (!hasSubItems || !isSubmenuOpen || !submenuPosition) return null;

          return createPortal(
            <div
              data-dropdown-menu
              className="fixed z-[10000] flex max-h-[320px] min-h-0 min-w-[200px] flex-col rounded-md border border-platform-input-border bg-platform-nav-bg shadow-lg"
              style={{
                top: submenuPosition.top,
                left: submenuPosition.left,
              }}
            >
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                <div
                  ref={submenuScrollRef}
                  className="min-h-0 flex-1 overflow-y-auto py-1"
                  style={{ maxHeight: 320 }}
                >
                  {item.subItems!.map((subItem) =>
                    renderDropdownItem(subItem, true)
                  )}
                </div>
                {showSubmenuScrollShade ? (
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-platform-nav-bg via-platform-nav-bg/80 to-transparent" />
                ) : null}
              </div>
            </div>,
            document.body
          );
        })}
    </div>
  );
}
