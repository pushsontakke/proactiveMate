# ProactiveMate frontend

The Next.js frontend for ProactiveMate: a calm AI productivity app that ranks tasks, breaks goals into focused steps, and replans overloaded days through Rescue Mode.

The backend currently exposes only its health-check route, so the app uses the typed in-memory API by default. Every feature consumes the same `ProactiveMateApi` interface that the Django client implements.

## Run locally

Requirements: Node 24 and npm 12.

```bash
cd frontend
npm install --ignore-scripts
npm run dev
```

Open `http://localhost:3000`. The root route redirects to `/dashboard`.

Useful checks:

```bash
npm run build
npx eslint .
npm audit
```

Install scripts are disabled in `.npmrc`, and `package-lock.json` is committed. The requested `minimum-release-age=4320` policy is also present. npm 12 currently reports that key as an unknown project config, so the lockfile and explicit registry version checks remain the effective controls until npm supports that setting.

## Mock and real API modes

Mocks are the safe default; no environment variable is required.

```bash
# Explicit mock mode
NEXT_PUBLIC_USE_MOCKS=true npm run dev

# Django API mode
NEXT_PUBLIC_USE_MOCKS=false \
NEXT_PUBLIC_API_URL=http://localhost:8000 \
npm run dev
```

Changing `NEXT_PUBLIC_USE_MOCKS` is the only code-path switch. `lib/api/index.ts` selects either `mockApi` or `realApi`, both implementing `ProactiveMateApi`.

The mock can exercise every designed AI state:

```bash
NEXT_PUBLIC_MOCK_STATE=healthy npm run dev   # mock AI response
NEXT_PUBLIC_MOCK_STATE=degraded npm run dev  # deterministic fallback (default)
NEXT_PUBLIC_MOCK_STATE=empty npm run dev     # designed empty states
NEXT_PUBLIC_MOCK_STATE=error npm run dev     # retryable error states
```

## Routes

- `/dashboard` — ranked today view, protected focus, timeline, Rescue panel, reliability insights, and command island.
- `/tasks/new` — calm task form with optional AI decomposition preview.
- `/rescue` — approval-gated before/after plan diff.
- `/settings` — calendar placeholder, notification preferences, and model-provider selection.

Press `Cmd+K` or `Ctrl+K` from the dashboard to open the command island.

## Architecture

- `app/` — Server Component route entry points and the smallest possible client provider boundary.
- `components/tasks/` — task row, score badge, and task-creation flow.
- `components/rescue/` — dashboard and full-page Rescue experiences.
- `components/shared/` — shell, command island, focus button, and async states.
- `lib/api/` — request/response types, fetch client, mock client, selector, and TanStack Query hooks.
- `lib/stores/` — Zustand state for UI-only command-island state.

Tailwind v4 tokens live in `app/globals.css`. Geist Sans and Geist Mono are loaded locally from the installed `geist` package through `next/font/local`; there are no runtime font or CDN requests.

## Runtime dependencies

Versions below match the committed lockfile:

| Package | Version | Purpose |
| --- | ---: | --- |
| Next.js | 16.3.1 | App Router framework |
| React / React DOM | 19.2.8 | UI runtime |
| TanStack Query | 5.101.4 | API/server state |
| Zustand | 5.0.15 | UI-only state |
| Motion | 13.1.0 | accessible layout and spring animation |
| Lucide React | 1.31.0 | interface icons |
| Geist | 1.7.2 | self-hosted Sans and Mono fonts |

Tailwind CSS 4.3.3, TypeScript 5.9.3, ESLint 9.39.5, and the create-next-app defaults are development dependencies.

## Assumptions

- The mock user display name is **Piyush**, and date/time formatting uses the browser timezone.
- The default mock state is degraded so fallback transparency is visible during review. Set `NEXT_PUBLIC_MOCK_STATE=healthy` for the standard AI state.
- The TSD makes decomposition part of task creation but the requested pre-save preview needs a read-only call. The real client reserves `POST /api/v1/tasks/decompose/`; the backend must add that endpoint or revise the interface before mock mode is disabled.
- Settings are intentionally preview-only and remain in component state until backend preference endpoints exist.
- `npm run dev` uses Turbopack. The production build script uses Next.js's supported webpack flag because the managed workspace blocks Turbopack's internal PostCSS worker port during builds.
- No authentication screens or persistence were added, as requested.

## Security notes

- No API keys or secrets use `NEXT_PUBLIC_` variables; only the public API origin and mock switches do.
- Real API requests use `fetch` with `credentials: "include"` for future httpOnly JWT cookies.
- No remote scripts, CDN styles, Google Font requests, or runtime-downloaded code are used.
- The dependency allowlist is unchanged; no additional runtime packages were introduced.
