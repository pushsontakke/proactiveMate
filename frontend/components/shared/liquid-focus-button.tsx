"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

interface LiquidFocusButtonProps {
  onChange?: (active: boolean) => void;
}

export function LiquidFocusButton({ onChange }: LiquidFocusButtonProps) {
  const [active, setActive] = useState(false);
  const reduceMotion = useReducedMotion();

  function toggleFocus() {
    const next = !active;
    setActive(next);
    onChange?.(next);
  }

  return (
    <motion.button
      type="button"
      aria-pressed={active}
      data-active={active}
      onClick={toggleFocus}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="liquid-focus min-h-11 rounded-full border border-clay px-5 py-2.5 text-sm font-medium text-ink"
    >
      <span className="relative z-10">
        {active ? "Focus session active" : "Start focus session"}
      </span>
    </motion.button>
  );
}
