"use client";

import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import StackIcon from "@/components/blnk-icons/stack-icon";
import { cn } from "@/lib/utils";

type FilterCardProps = {
  title: string;
  sub: string;
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  showSub?: boolean;
};

export default function FilterCard({
  title,
  sub,
  selected,
  onClick,
  icon,
  showSub = true,
}: FilterCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const iconFill = selected
    ? "var(--platform-brand-primary)"
    : isHovered
      ? "#ffffff"
      : "#566873";

  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-3 whitespace-nowrap rounded-md border border-platform-stroke p-2 text-sm",
        selected
          ? "text-platform-nav-text-selected"
          : "text-platform-muted hover:text-platform-primary-text"
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-md bg-platform-brand-primary-muted"
        initial={false}
        animate={{ opacity: selected ? 1 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      />
      <motion.span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-platform-button-text-button"
        initial={false}
        animate={{ opacity: selected ? 1 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      />
      <div className="relative z-10 flex items-center gap-1.5">
        <div className="flex-shrink-0 transition-colors duration-200 ease-out">
          {icon ? (
            isValidElement(icon) ? (
              cloneElement(icon as ReactElement<{ fill?: string; color?: string }>, {
                fill: iconFill,
                color: iconFill,
              })
            ) : (
              icon
            )
          ) : (
            <StackIcon fill={iconFill} color={iconFill} />
          )}
        </div>
        <p className="text-sm font-semibold leading-4">{title}</p>
      </div>
      {showSub ? (
        <p
          className={cn(
            "relative z-10 numeric-value text-xs font-normal transition-colors duration-200 ease-out",
            selected
              ? "text-platform-nav-text-selected"
              : "text-platform-muted"
          )}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}
