"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type SheetPanelRailProps = {
  showSecondary: boolean;
  primary: ReactNode;
  secondary: ReactNode;
};

export default function SheetPanelRail({
  showSecondary,
  primary,
  secondary,
}: SheetPanelRailProps) {
  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex w-[200%]"
        animate={{ x: showSecondary ? "-50%" : "0%" }}
        transition={{
          type: "tween",
          duration: 0.25,
          ease: "easeOut",
        }}
        style={{ willChange: "transform" }}
      >
        <div className="w-1/2 shrink-0">{primary}</div>
        <div className="w-1/2 shrink-0">{secondary}</div>
      </motion.div>
    </div>
  );
}
