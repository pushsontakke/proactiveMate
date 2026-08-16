"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useRescuePlan, useSchedule, useTasks } from "@/lib/api/hooks";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { AppShell } from "@/components/shared/app-shell";
import { CommandIsland } from "@/components/shared/command-island";
import { DashboardSkeleton, EmptyTasksState, ErrorState, SkeletonLine } from "@/components/shared/async-states";
import { LiquidFocusButton } from "@/components/shared/liquid-focus-button";
import { RescuePanel } from "@/components/rescue/rescue-panel";
import { TaskRow } from "@/components/tasks/task-row";

export function DashboardView() {
  const tasksQuery = useTasks();
  const scheduleQuery = useSchedule();
  const rescueQuery = useRescuePlan();
  const [yieldedIds, setYieldedIds] = useState<number[]>([]);
  const reduceMotion = useReducedMotion();

  if (tasksQuery.isPending || scheduleQuery.isPending) {
    return <AppShell><DashboardSkeleton /></AppShell>;
  }

  if (tasksQuery.isError || scheduleQuery.isError) {
    return <AppShell><main className="px-4 pt-12 sm:px-6"><ErrorState onRetry={() => { void tasksQuery.refetch(); void scheduleQuery.refetch(); }} /></main></AppShell>;
  }

  const tasks = tasksQuery.data.data;
  const schedule = scheduleQuery.data.data;
  const degraded = tasksQuery.data.ai_meta.degraded || scheduleQuery.data.ai_meta.degraded;
  const openTasks = tasks.filter((task) => task.status !== "done");
  const focusTask = openTasks.find((task) => task.tags.includes("protected")) ?? openTasks[0];
  const upNext = openTasks.filter((task) => task.id !== focusTask?.id).slice(0, 5);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <AppShell degraded={degraded}>
      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        {tasks.length === 0 ? (
          <div className="pt-8"><EmptyTasksState /></div>
        ) : (
          <div className="grid grid-cols-12 gap-8 lg:gap-12">
            <section className="col-span-12 space-y-8 lg:col-span-8" aria-labelledby="today-heading">
              <div className="space-y-3">
                <div className="micro-label flex items-center gap-2 text-ink-muted">
                  <span>{formatDate(new Date())}</span><span aria-hidden="true" className="h-1 w-1 rounded-full bg-clay" /><span>{formatDuration(schedule.workable_minutes)} workable left</span>
                </div>
                <h1 id="today-heading" className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
                  {greeting}, Piyush.<br /><span className="text-ink-muted">We protected the most important one.</span>
                </h1>
              </div>

              {focusTask ? (
                <section className="surface-card p-5 sm:p-6" aria-labelledby="focus-title">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                    <div>
                      <p className="micro-label text-amber">Best next move · <span className="font-mono">{Math.round(focusTask.ai_score ?? 0)}</span></p>
                      <h2 id="focus-title" className="mt-2 text-xl font-medium tracking-[-0.02em] sm:text-2xl">{focusTask.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-ink-muted">{formatDuration(focusTask.effort_min)} · {focusTask.ai_reason}</p>
                    </div>
                    <LiquidFocusButton />
                  </div>
                </section>
              ) : null}

              <section aria-labelledby="timeline-title">
                <h2 id="timeline-title" className="micro-label mb-4 text-ink-muted">Your next 4 hours</h2>
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.05 } } }}
                  className="space-y-3"
                >
                  {schedule.calendar_blocks.map((block) => (
                    <motion.article key={block.id} variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="flex items-center gap-4 rounded-xl border border-clay/20 bg-white/40 p-4">
                      <time className="w-13 shrink-0 font-mono text-xs text-ink-muted sm:w-16 sm:text-sm">{formatTime(block.start)}</time>
                      <div><h3 className="text-sm font-medium">{block.title}</h3><p className="mt-0.5 text-xs text-ink-muted">Calendar · {block.protected ? "protected" : "flexible"}</p></div>
                    </motion.article>
                  ))}
                  {schedule.tasks.slice(0, 3).map((task, index) => (
                    <TaskRow key={task.id} task={task} emphasized={index === 0} yielded={yieldedIds.includes(task.id)} />
                  ))}
                </motion.div>
              </section>

              <section aria-labelledby="up-next-title">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <h2 id="up-next-title" className="micro-label text-ink-muted">Up next</h2>
                  <p className="text-[0.68rem] text-ink-muted">ranked by urgency × impact ÷ effort</p>
                </div>
                <div className="space-y-2">
                  {upNext.map((task) => <TaskRow key={task.id} task={task} showTime={false} yielded={yieldedIds.includes(task.id)} />)}
                </div>
              </section>
            </section>

            <aside className="col-span-12 space-y-8 lg:sticky lg:top-6 lg:col-span-4 lg:self-start">
              {rescueQuery.isPending ? <SkeletonLine className="h-96 w-full rounded-2xl" /> : rescueQuery.isError ? (
                <section className="surface-card p-6"><h2 className="font-semibold">Rescue Mode</h2><p className="mt-2 text-sm leading-6 text-ink-muted">The rescue canvas couldn&apos;t refresh. Your current plan has not moved.</p><button type="button" onClick={() => void rescueQuery.refetch()} className="mt-5 min-h-11 rounded-full border border-clay px-4 text-sm font-medium">Try again</button></section>
              ) : <RescuePanel plan={rescueQuery.data.data} tasks={tasks} onApplied={setYieldedIds} />}

              <section className="rounded-2xl border border-clay/30 bg-white/40 p-6" aria-labelledby="reliability-title">
                <div className="flex items-center justify-between gap-4"><h2 id="reliability-title" className="font-semibold tracking-[-0.02em]">Plan reliability</h2><span className="font-mono text-2xl font-semibold">62%</span></div>
                <p className="mt-2 text-xs text-ink-muted">Up 11 points after protecting evening focus.</p>
                <ol className="mt-6 space-y-4">
                  <li className="flex gap-3"><span className="font-mono text-xs font-semibold text-ink-muted">01</span><p className="text-sm leading-5">Protect 9:00–10:30 PM. Your most consistent completion window.</p></li>
                  <li className="flex gap-3"><span className="font-mono text-xs font-semibold text-ink-muted">02</span><p className="text-sm leading-5">Cap tasks at 60 minutes. Longer work gets moved twice as often.</p></li>
                </ol>
              </section>
            </aside>
          </div>
        )}
      </main>
      <CommandIsland />
    </AppShell>
  );
}
