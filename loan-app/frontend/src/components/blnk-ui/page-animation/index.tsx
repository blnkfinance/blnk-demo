"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

type PageAnimationProps = {
  children: ReactNode;
  id: string;
};

const transition = {
  duration: 0.15,
  ease: "easeOut" as const,
};

export default function PageAnimation({ children, id }: PageAnimationProps) {
  return (
    <div className="relative min-w-0">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={id}
          className="min-w-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
