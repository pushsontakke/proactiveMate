"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useDecompositionPreview } from "@/lib/api/hooks";
import { formatDateTime, formatDuration } from "@/lib/format";
import { useUiStore } from "@/lib/stores/ui-store";

const exampleOutcomes = [
  "Ship the waitlist MVP by Friday",
  "Prepare three slides for the investor call",
];

function tomorrowDeadline() {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 1);
  deadline.setHours(17, 0, 0, 0);
  return deadline.toISOString();
}

export function CommandIsland() {
  const [value, setValue] = useState("");
  const islandRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandOpen = useUiStore((state) => state.commandOpen);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const decomposition = useDecompositionPreview();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    function focusCommand(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }

    function closeOnOutsideClick(event: MouseEvent) {
      if (
        !islandRef.current?.contains(event.target as Node) &&
        value.trim() === ""
      ) {
        setCommandOpen(false);
      }
    }

    document.addEventListener("keydown", focusCommand);
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", focusCommand);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [setCommandOpen, value]);

  function generatePlan(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return;
    decomposition.mutate({ title: value.trim(), due_at: tomorrowDeadline() });
  }

  return (
    <motion.div
      ref={islandRef}
      layout
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 150, damping: 20 }
      }
      className={`fixed bottom-4 left-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden bg-ink text-canvas shadow-island sm:bottom-8 ${
        commandOpen
          ? "max-w-[600px] rounded-2xl p-5 sm:p-6"
          : "h-14 max-w-[420px] rounded-2xl px-5"
      }`}
    >
      <form onSubmit={generatePlan}>
        <div className="flex h-9 items-center gap-3">
          <Sparkles aria-hidden="true" size={20} strokeWidth={1.5} className="shrink-0 text-canvas/50" />
          <label htmlFor="command-outcome" className="sr-only">Describe an outcome for AI planning</label>
          <input
            ref={inputRef}
            id="command-outcome"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onFocus={() => setCommandOpen(true)}
            placeholder="Describe the outcome..."
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base font-medium text-canvas placeholder:text-canvas/40"
          />
          {!commandOpen ? (
            <kbd className="hidden rounded-md border border-canvas/15 px-2 py-1 font-mono text-[0.65rem] text-canvas/45 sm:block">⌘ K</kbd>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
          {commandOpen ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              transition={{ delay: reduceMotion ? 0 : 0.08 }}
              className="mt-4 border-t border-white/10 pt-4"
            >
              <p className="micro-label text-canvas/45">
                {decomposition.data ? "Suggested steps" : "Try an outcome"}
              </p>

              <div className="mt-3 space-y-1">
                {decomposition.isPending ? (
                  <div aria-label="Generating suggested steps" className="space-y-2 py-2">
                    {[72, 88, 64].map((width) => (
                      <div key={width} className="h-8 animate-pulse rounded-lg bg-canvas/8" style={{ width: `${width}%` }} />
                    ))}
                  </div>
                ) : decomposition.isError ? (
                  <p role="alert" className="py-2 text-sm leading-6 text-canvas/65">
                    We couldn&apos;t shape that plan just now. Your words are still here—try again when ready.
                  </p>
                ) : decomposition.data ? (
                  decomposition.data.data.map((step, index) => (
                    <motion.div
                      key={step.title}
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reduceMotion ? 0 : index * 0.05 }}
                      className="rounded-lg py-2 text-sm"
                    >
                      <p className="font-medium text-canvas">{step.title}</p>
                      <p className="mt-0.5 font-mono text-[0.68rem] text-canvas/45">
                        {formatDuration(step.effort_min)} · {formatDateTime(step.due_at)}
                      </p>
                    </motion.div>
                  ))
                ) : (
                  exampleOutcomes.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setValue(example)}
                      className="block min-h-10 w-full rounded-lg px-2 text-left text-sm text-canvas/75 transition-colors hover:bg-white/5 hover:text-amber"
                    >
                      {example}
                    </button>
                  ))
                )}
              </div>

              <button
                type="submit"
                disabled={!value.trim() || decomposition.isPending}
                className="mt-4 min-h-11 w-full rounded-lg bg-amber px-4 py-2.5 text-sm font-semibold text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {decomposition.data ? "Regenerate plan" : "Generate rescue plan"}
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}
