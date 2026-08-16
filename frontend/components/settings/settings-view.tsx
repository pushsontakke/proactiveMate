"use client";

import { Bell, Brain, CalendarDays, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { AppShell } from "@/components/shared/app-shell";

export function SettingsView() {
  const [email, setEmail] = useState(true);
  const [inApp, setInApp] = useState(true);
  const [provider, setProvider] = useState("gemini");
  const [saved, setSaved] = useState(false);

  function savePreferences(event: FormEvent) {
    event.preventDefault();
    setSaved(true);
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-4 pt-3 sm:px-6 sm:pt-8">
        <p className="micro-label text-ink-muted">Preferences</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">A few quiet controls. More integrations will arrive after the planning core.</p>

        <form onSubmit={savePreferences} className="mt-9 space-y-6">
          <section className="surface-card p-5 sm:p-6" aria-labelledby="calendar-settings">
            <div className="flex items-start gap-3">
              <CalendarDays aria-hidden="true" size={20} strokeWidth={1.5} className="mt-0.5 text-amber" />
              <div className="flex-1">
                <h2 id="calendar-settings" className="font-semibold tracking-[-0.02em]">Calendar</h2>
                <p className="mt-1 text-sm leading-6 text-ink-muted">Connect Google or Outlook to protect events and find real free windows.</p>
                <button type="button" disabled className="mt-4 min-h-11 rounded-full border border-clay px-5 text-sm font-medium text-ink-muted opacity-60">Connect calendar · Coming soon</button>
              </div>
            </div>
          </section>

          <section className="surface-card p-5 sm:p-6" aria-labelledby="notification-settings">
            <div className="flex items-start gap-3">
              <Bell aria-hidden="true" size={20} strokeWidth={1.5} className="mt-0.5 text-amber" />
              <div className="flex-1">
                <h2 id="notification-settings" className="font-semibold tracking-[-0.02em]">Notifications</h2>
                <p className="mt-1 text-sm leading-6 text-ink-muted">Keep nudges useful and stop them as soon as work starts.</p>
                <div className="mt-5 divide-y divide-clay/20">
                  <PreferenceToggle label="In-app reminders" detail="Gentle deadline and Rescue Mode prompts" checked={inApp} onChange={setInApp} />
                  <PreferenceToggle label="Email reminders" detail="For important tasks within two hours" checked={email} onChange={setEmail} />
                  <div className="flex items-center justify-between gap-4 py-4 opacity-55">
                    <div><p className="text-sm font-medium">SMS escalation</p><p className="mt-1 text-xs text-ink-muted">Opt-in support is coming soon</p></div>
                    <span className="rounded-full border border-clay px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.05em] text-ink-muted">Soon</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="surface-card p-5 sm:p-6" aria-labelledby="ai-settings">
            <div className="flex items-start gap-3">
              <Brain aria-hidden="true" size={20} strokeWidth={1.5} className="mt-0.5 text-amber" />
              <div className="min-w-0 flex-1">
                <h2 id="ai-settings" className="font-semibold tracking-[-0.02em]">Planning provider</h2>
                <p className="mt-1 text-sm leading-6 text-ink-muted">Choose the model path used for ranking and decomposition.</p>
                <label htmlFor="provider" className="mt-5 block text-sm font-medium">Preferred provider</label>
                <select id="provider" value={provider} onChange={(event) => setProvider(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-clay/40 bg-white/55 px-3 text-sm">
                  <option value="gemini">Gemini · primary</option>
                  <option value="groq">Groq · fast path</option>
                  <option value="none">Deterministic fallback only</option>
                </select>
                <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-ink-muted"><LockKeyhole aria-hidden="true" size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />API keys remain server-side and are never exposed to this browser.</p>
              </div>
            </div>
          </section>

          {saved ? <p role="status" className="rounded-lg border border-amber/30 bg-amber/8 p-3 text-sm font-medium">Preferences saved for this preview.</p> : null}
          <button type="submit" className="min-h-12 w-full rounded-xl bg-ink px-5 text-sm font-medium text-canvas">Save preferences</button>
        </form>
      </main>
    </AppShell>
  );
}

function PreferenceToggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-4">
      <span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-ink-muted">{detail}</span></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className="toggle-track relative h-7 w-12 shrink-0 rounded-full border border-clay bg-white transition-colors peer-checked:border-amber peer-checked:bg-amber peer-focus-visible:ring-2 peer-focus-visible:ring-amber/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas">
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-clay" />
      </span>
    </label>
  );
}
