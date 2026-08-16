"use client";

import { RotateCcw } from "lucide-react";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-clay/20 ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div aria-label="Loading today's plan" className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="grid grid-cols-12 gap-6 lg:gap-12">
        <div className="col-span-12 space-y-8 lg:col-span-8">
          <div className="space-y-3"><SkeletonLine className="h-3 w-56" /><SkeletonLine className="h-11 w-4/5" /><SkeletonLine className="h-11 w-3/5" /></div>
          <SkeletonLine className="h-36 w-full rounded-2xl" />
          <div className="space-y-3">{[1, 2, 3, 4].map((item) => <SkeletonLine key={item} className="h-18 w-full rounded-xl" />)}</div>
        </div>
        <div className="col-span-12 lg:col-span-4"><SkeletonLine className="h-96 w-full rounded-2xl" /></div>
      </div>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="surface-card mx-auto max-w-xl px-6 py-12 text-center" role="alert">
      <div aria-hidden="true" className="mx-auto mb-6 flex h-14 w-14 rotate-6 items-center justify-center rounded-2xl border border-amber/40"><span className="h-4 w-4 rounded-full bg-amber/50" /></div>
      <h2 className="text-xl font-semibold tracking-[-0.02em]">Your plan is still safe.</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-muted">We couldn&apos;t refresh the latest plan. Try once more, or come back when the connection settles.</p>
      <button type="button" onClick={onRetry} className="mx-auto mt-6 flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-canvas">
        <RotateCcw aria-hidden="true" size={18} strokeWidth={1.5} /> Try again
      </button>
    </div>
  );
}

export function EmptyTasksState() {
  return (
    <div className="surface-card px-6 py-14 text-center">
      <div aria-hidden="true" className="relative mx-auto mb-6 h-16 w-20"><span className="absolute left-2 top-2 h-11 w-11 rotate-6 rounded-2xl border border-clay" /><span className="absolute bottom-1 right-2 h-8 w-8 rounded-full bg-amber/25" /></div>
      <h2 className="text-lg font-semibold tracking-[-0.02em]">A clear day, for now.</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">No tasks—add one below, or describe your day and let AI plan it.</p>
      <LinkButton />
    </div>
  );
}

function LinkButton() {
  return <a href="/tasks/new" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-canvas">Add your first task</a>;
}
