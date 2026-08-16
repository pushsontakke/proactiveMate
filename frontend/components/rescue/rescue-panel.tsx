"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import type { RescuePlan, Task } from "@/lib/api";
import { useApplyRescuePlan } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/format";

interface RescuePanelProps {
  plan: RescuePlan;
  tasks: Task[];
  onApplied: (taskIds: number[]) => void;
}

export function RescuePanel({ plan, tasks, onApplied }: RescuePanelProps) {
  const [confirming, setConfirming] = useState(false);
  const applyPlan = useApplyRescuePlan();
  const reduceMotion = useReducedMotion();

  function taskTitle(taskId: number) {
    return tasks.find((task) => task.id === taskId)?.title ?? "Task";
  }

  function confirmPlan() {
    applyPlan.mutate(plan.items, {
      onSuccess: () => {
        onApplied(plan.items.map((item) => item.task_id));
        setConfirming(false);
      },
    });
  }

  return (
    <section className="surface-card p-5 sm:p-6" aria-labelledby="rescue-title">
      <div className="flex items-center justify-between gap-4">
        <h2 id="rescue-title" className="font-semibold tracking-[-0.02em]">Rescue Mode</h2>
        <Link href="/rescue" className="min-h-9 rounded-full px-2 py-2 text-xs font-medium text-ink-muted hover:text-ink">Full view</Link>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-muted">Three moves can recover the day. Nothing moves until you approve.</p>

      <div className="mt-5 space-y-3">
        {plan.items.map((item, index) => (
          <motion.div
            key={item.task_id}
            layoutId={`rescue-${item.task_id}`}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : index * 0.05 }}
            className="rounded-lg border border-clay/20 bg-canvas p-3"
          >
            <p className={`micro-label ${item.label === "Protected window" ? "text-amber" : "text-ink-muted"}`}>{item.label}</p>
            <p className="mt-1 text-sm font-medium">{taskTitle(item.task_id)}</p>
            <p className="mt-1 font-mono text-[0.68rem] leading-5 text-ink-muted">{formatDateTime(item.old_due_at)} → {formatDateTime(item.new_due_at)}</p>
          </motion.div>
        ))}
      </div>

      {applyPlan.isError ? <p role="alert" className="mt-4 text-sm leading-6 text-ink-muted">The plan stayed exactly where it was. Try applying it again when ready.</p> : null}
      {applyPlan.isSuccess ? <p role="status" className="mt-4 text-sm leading-6 text-ink-muted">Plan applied. Your protected work now has room.</p> : null}

      <AnimatePresence mode="wait" initial={false}>
        {confirming ? (
          <motion.div key="confirm" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 rounded-xl border border-amber/25 bg-amber/5 p-3">
            <p className="text-sm font-medium">Apply these three moves?</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="min-h-10 flex-1 rounded-full border border-clay px-3 text-xs font-medium">Keep current</button>
              <button type="button" disabled={applyPlan.isPending} onClick={confirmPlan} className="min-h-10 flex-1 rounded-full bg-ink px-3 text-xs font-medium text-canvas disabled:opacity-50">Confirm plan</button>
            </div>
          </motion.div>
        ) : (
          <motion.button key="apply" type="button" onClick={() => setConfirming(true)} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 min-h-11 w-full rounded-xl bg-ink px-4 py-3 text-sm font-medium text-canvas transition-colors hover:bg-ink/90">Apply this plan</motion.button>
        )}
      </AnimatePresence>
    </section>
  );
}
