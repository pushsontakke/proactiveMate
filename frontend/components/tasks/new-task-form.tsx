"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import type { CreateTaskRequest, TaskPriority } from "@/lib/api";
import { useCreateTask, useDecompositionPreview } from "@/lib/api/hooks";
import { formatDateTime, formatDuration } from "@/lib/format";
import { AppShell } from "@/components/shared/app-shell";
import { SkeletonLine } from "@/components/shared/async-states";

function defaultDeadline() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(17, 0, 0, 0);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const fieldClass = "mt-2 min-h-12 w-full rounded-lg border border-clay/40 bg-white/55 px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/55 focus:border-amber";

export function NewTaskForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState(defaultDeadline);
  const [priority, setPriority] = useState<TaskPriority>(2);
  const [effort, setEffort] = useState(45);
  const [aiPlan, setAiPlan] = useState(false);
  const preview = useDecompositionPreview();
  const createTask = useCreateTask();
  const reduceMotion = useReducedMotion();

  function requestPreview() {
    if (!title.trim() || !dueAt) return;
    preview.mutate({ title: title.trim(), due_at: new Date(dueAt).toISOString() });
  }

  function toggleAiPlan() {
    const next = !aiPlan;
    setAiPlan(next);
    if (next && title.trim() && dueAt) {
      preview.mutate({ title: title.trim(), due_at: new Date(dueAt).toISOString() });
    }
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: CreateTaskRequest = {
      title: title.trim(),
      description: description.trim(),
      due_at: new Date(dueAt).toISOString(),
      priority,
      effort_min: effort,
      tags: aiPlan ? ["ai-planned"] : [],
    };
    createTask.mutate({ input, aiPlan });
  }

  const degraded = preview.data?.ai_meta.degraded ?? false;

  return (
    <AppShell degraded={degraded}>
      <main className="mx-auto max-w-2xl px-4 pt-3 sm:px-6 sm:pt-8">
        <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-full pr-3 text-xs font-medium text-ink-muted hover:text-ink">
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.5} /> Back to today
        </Link>

        <div className="mt-5">
          <p className="micro-label text-ink-muted">Make the next move visible</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">Add a task</h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">Give it enough shape to plan—ProactiveMate will handle the order.</p>
        </div>

        <form onSubmit={submitTask} className="surface-card mt-8 space-y-6 p-5 sm:p-7">
          <div>
            <label htmlFor="task-title" className="text-sm font-medium">Title</label>
            <input id="task-title" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Finish the investor update" className={fieldClass} />
          </div>

          <div>
            <label htmlFor="task-description" className="text-sm font-medium">Description <span className="font-normal text-ink-muted">(optional)</span></label>
            <textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does done look like?" rows={4} className={`${fieldClass} resize-none`} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="task-due" className="text-sm font-medium">Due</label>
              <input id="task-due" type="datetime-local" required value={dueAt} onChange={(event) => setDueAt(event.target.value)} className={`${fieldClass} font-mono text-xs`} />
            </div>
            <div>
              <label htmlFor="task-effort" className="text-sm font-medium">Effort in minutes</label>
              <input id="task-effort" type="number" min={5} max={720} step={5} required value={effort} onChange={(event) => setEffort(Number(event.target.value))} className={`${fieldClass} font-mono`} />
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Priority</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([1, 2, 3] as TaskPriority[]).map((value) => (
                <button key={value} type="button" aria-pressed={priority === value} onClick={() => setPriority(value)} className={`min-h-11 rounded-lg border px-3 text-sm transition-colors ${priority === value ? "border-amber bg-amber/10 font-medium" : "border-clay/40 bg-white/40 text-ink-muted hover:border-clay"}`}>
                  {value} · {value === 1 ? "Low" : value === 2 ? "Medium" : "High"}
                </button>
              ))}
            </div>
          </fieldset>

          <section className="rounded-xl border border-clay/25 bg-canvas/70 p-4" aria-labelledby="ai-plan-label">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><Sparkles aria-hidden="true" size={18} strokeWidth={1.5} className="text-amber" /><h2 id="ai-plan-label" className="text-sm font-medium">Let AI plan it</h2></div>
                <p className="mt-1 text-xs leading-5 text-ink-muted">Preview 2–5 smaller steps before saving.</p>
              </div>
              <motion.button type="button" role="switch" aria-checked={aiPlan} aria-label="Let AI plan this task" onClick={toggleAiPlan} whileTap={reduceMotion ? undefined : { scale: 0.95 }} className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${aiPlan ? "border-amber bg-amber" : "border-clay bg-white"}`}>
                <motion.span layout transition={{ type: "spring", stiffness: 300, damping: 25 }} className={`absolute top-1 h-4 w-4 rounded-full ${aiPlan ? "left-7 bg-canvas" : "left-1 bg-clay"}`} />
              </motion.button>
            </div>

            {aiPlan ? (
              <div className="mt-4 border-t border-clay/20 pt-4">
                {preview.isPending ? (
                  <div aria-label="Creating task preview" className="space-y-2">{[1, 2, 3].map((item) => <SkeletonLine key={item} className="h-14 w-full" />)}</div>
                ) : preview.isError ? (
                  <div><p role="alert" className="text-sm leading-6 text-ink-muted">AI couldn&apos;t split this one just now. You can still save it as a single task.</p><button type="button" onClick={requestPreview} className="mt-3 min-h-10 rounded-full border border-clay px-4 text-xs font-medium">Try preview again</button></div>
                ) : preview.data ? (
                  <div>
                    {preview.data.ai_meta.degraded ? (
                      <p className="mb-3 flex items-center gap-2 rounded-lg border border-clay/30 bg-white/45 px-3 py-2 text-xs text-ink-muted">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber" />
                        AI is resting; these steps use deterministic planning.
                      </p>
                    ) : null}
                    <ol className="space-y-2">
                      {preview.data.data.map((step, index) => (
                        <motion.li key={step.title} initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : index * 0.05 }} className="rounded-lg border border-clay/20 bg-white/45 p-3">
                          <p className="text-sm font-medium">{step.title}</p><p className="mt-1 font-mono text-[0.68rem] text-ink-muted">{formatDuration(step.effort_min)} · due {formatDateTime(step.due_at)}</p>
                        </motion.li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <div><p className="text-sm leading-6 text-ink-muted">Add a title and deadline, then preview the plan.</p><button type="button" disabled={!title.trim() || !dueAt} onClick={requestPreview} className="mt-3 min-h-10 rounded-full border border-clay px-4 text-xs font-medium disabled:opacity-40">Preview steps</button></div>
                )}
              </div>
            ) : null}
          </section>

          {createTask.isError ? <p role="alert" className="rounded-lg border border-clay/30 bg-white/45 p-3 text-sm leading-6 text-ink-muted">This task stayed unsaved. Check the details and try again.</p> : null}
          {createTask.isSuccess ? <div role="status" className="rounded-lg border border-amber/30 bg-amber/5 p-3"><p className="text-sm font-medium">Task saved{createTask.data.data.subtasks.length ? ` with ${createTask.data.data.subtasks.length} planned steps` : ""}.</p><Link href="/dashboard" className="mt-2 inline-flex min-h-9 items-center text-xs font-medium text-amber">Return to today →</Link></div> : null}

          <button type="submit" disabled={createTask.isPending || !title.trim() || !dueAt} className="min-h-12 w-full rounded-xl bg-ink px-5 py-3 text-sm font-medium text-canvas transition-opacity disabled:cursor-not-allowed disabled:opacity-40">
            {createTask.isPending ? "Saving your task…" : aiPlan ? "Save task and steps" : "Save task"}
          </button>
        </form>
      </main>
    </AppShell>
  );
}
