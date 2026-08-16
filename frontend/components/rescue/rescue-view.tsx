"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApplyRescuePlan, useRescuePlan, useTasks } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/format";
import { AppShell } from "@/components/shared/app-shell";
import { ErrorState, SkeletonLine } from "@/components/shared/async-states";

export function RescueView() {
  const tasksQuery = useTasks();
  const rescueQuery = useRescuePlan();
  const applyPlan = useApplyRescuePlan();
  const [applied, setApplied] = useState(false);
  const reduceMotion = useReducedMotion();

  if (tasksQuery.isPending || rescueQuery.isPending) {
    return (
      <AppShell>
        <main className="mx-auto max-w-4xl space-y-5 px-4 pt-8 sm:px-6">
          <SkeletonLine className="h-12 w-3/5" />
          <SkeletonLine className="h-6 w-4/5" />
          {[1, 2, 3].map((item) => <SkeletonLine key={item} className="h-44 w-full rounded-2xl" />)}
        </main>
      </AppShell>
    );
  }

  if (tasksQuery.isError || rescueQuery.isError) {
    return <AppShell><main className="px-4 pt-16 sm:px-6"><ErrorState onRetry={() => { void tasksQuery.refetch(); void rescueQuery.refetch(); }} /></main></AppShell>;
  }

  const tasks = tasksQuery.data.data;
  const plan = rescueQuery.data.data;
  const degraded = tasksQuery.data.ai_meta.degraded || rescueQuery.data.ai_meta.degraded;

  function taskTitle(taskId: number) {
    return tasks.find((task) => task.id === taskId)?.title ?? "Task";
  }

  function confirmPlan() {
    applyPlan.mutate(plan.items, { onSuccess: () => setApplied(true) });
  }

  return (
    <AppShell degraded={degraded}>
      <main className="mx-auto max-w-4xl px-4 pt-3 sm:px-6 sm:pt-8">
        <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-full pr-3 text-xs font-medium text-ink-muted hover:text-ink">
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.5} /> Back to today
        </Link>

        <div className="mt-5 max-w-2xl">
          <p className="micro-label text-amber">Rescue Mode</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">Recover the day without rushing it.</h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">{plan.summary} Nothing moves until you approve.</p>
        </div>

        {plan.items.length === 0 ? (
          <section className="surface-card mt-10 px-6 py-14 text-center">
            <div aria-hidden="true" className="mx-auto mb-5 h-12 w-12 rounded-full border border-amber/40 bg-amber/10" />
            <h2 className="text-lg font-semibold">No rescue needed.</h2>
            <p className="mt-2 text-sm text-ink-muted">Your open work already fits the time available.</p>
          </section>
        ) : (
          <div className="mt-10 space-y-4">
            {plan.items.map((item, index) => (
              <motion.article
                key={item.task_id}
                layoutId={`task-${item.task_id}`}
                layout
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: applied && item.label === "Yields (safe)" ? 0.65 : 1, y: 0, scale: applied && item.label === "Yields (safe)" ? 0.98 : 1 }}
                transition={{ type: "spring", stiffness: 150, damping: 20, delay: reduceMotion ? 0 : index * 0.05 }}
                className={`surface-card p-5 sm:p-6 ${applied ? "border-amber/30" : ""}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className={`micro-label ${item.label === "Protected window" ? "text-amber" : "text-ink-muted"}`}>{item.label}</p>
                    <h2 className="mt-1 text-lg font-medium tracking-[-0.02em]">{taskTitle(item.task_id)}</h2>
                  </div>
                  {applied ? <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/8 px-3 py-1.5 text-xs font-medium text-ink-muted"><ShieldCheck aria-hidden="true" size={16} strokeWidth={1.5} /> Applied</span> : null}
                </div>

                <div className="mt-5 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
                  <div className={`rounded-lg border border-clay/20 bg-canvas p-3 ${applied ? "opacity-45" : ""}`}>
                    <p className="micro-label text-ink-muted">Before</p>
                    <time className="mt-1 block font-mono text-xs text-ink-muted">{formatDateTime(item.old_due_at)}</time>
                  </div>
                  <ArrowRight aria-hidden="true" size={20} strokeWidth={1.5} className="mx-auto rotate-90 text-clay sm:rotate-0" />
                  <div className={`rounded-lg border p-3 ${applied ? "border-amber/40 bg-amber/8" : "border-clay/20 bg-canvas"}`}>
                    <p className={`micro-label ${applied ? "text-amber" : "text-ink-muted"}`}>After</p>
                    <time className="mt-1 block font-mono text-xs text-ink">{formatDateTime(item.new_due_at)}</time>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-ink-muted">{item.reason}</p>
              </motion.article>
            ))}
          </div>
        )}

        {applyPlan.isError ? <p role="alert" className="mt-5 rounded-lg border border-clay/30 bg-white/50 p-3 text-sm text-ink-muted">Nothing moved. The current plan is intact—try confirming again when ready.</p> : null}
        {applied ? <p role="status" className="mt-5 rounded-lg border border-amber/30 bg-amber/8 p-4 text-sm font-medium">Rescue plan applied. Your highest-impact window is protected.</p> : null}

        {plan.items.length > 0 ? (
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link href="/dashboard" className="inline-flex min-h-12 items-center justify-center rounded-full border border-clay px-6 text-sm font-medium">{applied ? "Return to today" : "Cancel"}</Link>
            {!applied ? <button type="button" disabled={applyPlan.isPending} onClick={confirmPlan} className="min-h-12 rounded-full bg-ink px-7 text-sm font-medium text-canvas disabled:cursor-wait disabled:opacity-50">{applyPlan.isPending ? "Applying safely…" : "Confirm and apply"}</button> : null}
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
