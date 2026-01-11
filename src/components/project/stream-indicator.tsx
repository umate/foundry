"use client";

import { motion } from "framer-motion";

interface StreamIndicatorProps {
  className?: string;
}

export function StreamIndicator({ className }: StreamIndicatorProps) {
  return (
    <motion.div
      className={className}
      animate={{
        opacity: [1, 0.4, 1],
        scale: [1, 1.15, 1],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div className="size-2 rounded-sm bg-secondary" />
    </motion.div>
  );
}
