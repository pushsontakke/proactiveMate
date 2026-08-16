"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useUpdateTaskStatus } from "@/lib/api/hooks";
import type { Task, TaskStatus } from "@/lib/api";
import { formatDue, formatDuration, formatTime } from "@/lib/format";
import { ScoreBadge } from "./score-badge";

interface TaskRowProps {
  task: Task;
  emphasized?: boolean;
  yielded?: boolean;
  showTime?: boolean;
}

const nextStatus: Record<TaskStatus, TaskStatus> = {
  todo: "started",
  started: "done",
  done: "todo",
};

const nextStatusLabel: Record<TaskStatus, string> = {
  todo: "Start task",
  started: "Mark task complete",
  done: "Return task to to-do",
};

export function TaskRow({
  task,
  emphasized = false,
  yielded = false,
  showTime = true,
}: TaskRowProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const updateStatus = useUpdateTaskStatus();
  const reduceMotion = useReducedMotion();
  const done = task.status === "done";

  return (
    <motion.article
      layoutId={`task-${task.id}`}
      layout
      animate={{ opacity: yielded ? 0.4 : 1, scale: yielded ? 0.95 : 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 150, damping: 20 }
      }
      className={`group rounded-xl border px-3 py-3 transition-colors sm:px-4 ${
        emphasized
          ? "border-amber/30 bg-amber/5 hover:bg-amber/10"
          : "border-clay/20 bg-white/40 hover:bg-white/60"
      }`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {showTime ? (
          <time
            dateTime={task.due_at ?? undefined}
            className="w-13 shrink-0 font-mono text-xs tabular-nums text-ink-muted sm:w-16 sm:text-sm"
          >
            {task.due_at ? formatTime(task.due_at) : "—"}
          </time>
        ) : null}

        <div className="min-w-0 flex-1">
          <h3
            className={`truncate text-sm font-medium sm:text-[0.95rem] ${
              done ? "text-ink-muted line-through decoration-clay" : "text-ink"
            }`}
          >
            {task.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-ink-muted">
            {formatDue(task.due_at)} · {formatDuration(task.effort_min)}
            {task.parent_task_id ? " · AI-planned step" : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setWhyOpen((open) => !open)}
          aria-expanded={whyOpen}
          className="hidden min-h-9 rounded-full px-2 text-xs font-medium text-ink-muted transition-colors hover:text-ink sm:block"
        >
          Why
        </button>

        <ScoreBadge score={task.ai_score} />

        <button
          type="button"
          disabled={updateStatus.isPending}
          aria-label={`${nextStatusLabel[task.status]}: ${task.title}`}
          title={nextStatusLabel[task.status]}
          onClick={() =>
            updateStatus.mutate({ id: task.id, status: nextStatus[task.status] })
          }
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-wait disabled:opacity-50 ${
            done
              ? "border-amber bg-amber text-canvas"
              : task.status === "started"
                ? "border-amber bg-amber/10"
                : "border-clay bg-white/40 hover:border-amber"
          }`}
        >
          {done ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <motion.path
                d="M3 8.5 6.4 12 13 4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduceMotion ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.3 }}
              />
            </svg>
          ) : task.status === "started" ? (
            <span className="h-2 w-2 rounded-full bg-amber" />
          ) : (
            <span className="h-2 w-2 rounded-full border border-clay" />
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setWhyOpen((open) => !open)}
        aria-expanded={whyOpen}
        className="mt-2 min-h-9 text-xs font-medium text-ink-muted sm:hidden"
      >
        {whyOpen ? "Hide reason" : "Why this rank?"}
      </button>

      <AnimatePresence initial={false}>
        {whyOpen ? (
          <motion.p
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            className={`${showTime ? "sm:ml-20" : ""} overflow-hidden pr-12 text-xs leading-5 text-ink-muted`}
          >
            {task.ai_reason ?? "Ranked from urgency, impact, and estimated effort."}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}
