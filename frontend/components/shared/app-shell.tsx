import Link from "next/link";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  degraded?: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Today" },
  { href: "/tasks/new", label: "New task" },
  { href: "/rescue", label: "Rescue" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children, degraded = false }: AppShellProps) {
  return (
    <div className="min-h-screen pb-28 sm:pb-32">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex min-h-10 items-center gap-2.5 rounded-lg" aria-label="ProactiveMate dashboard">
            <span aria-hidden="true" className="h-6 w-6 rounded-md bg-ink" />
            <span className="font-semibold tracking-[-0.02em]">ProactiveMate</span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="min-h-10 rounded-full px-3 py-2.5 text-xs font-medium text-ink-muted transition-colors hover:bg-white/50 hover:text-ink">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {degraded ? (
            <div className="flex items-center gap-2 rounded-full border border-clay/40 bg-white/50 px-3 py-2 text-[0.7rem] text-ink-muted sm:text-xs" role="status">
              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
              <span className="hidden sm:inline">AI taking a break · Fallback scoring active</span>
              <span className="sm:hidden">Fallback scoring</span>
            </div>
          ) : null}
          <div aria-label="Piyush's profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-clay/30 text-xs font-semibold text-ink-muted">PS</div>
        </div>

        <nav aria-label="Mobile navigation" className="-order-1 flex w-full items-center justify-between border-b border-clay/20 pb-3 md:hidden">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="min-h-9 rounded-full px-2 py-2 text-[0.68rem] font-medium text-ink-muted hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
