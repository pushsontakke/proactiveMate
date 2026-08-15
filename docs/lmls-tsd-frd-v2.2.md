# The Last-Minute Life Saver — TSD & FRD

> **Version:** 2.2 · **Status:** Active
> **Stack (committed):** Next.js 16.x (App Router, TypeScript) · Django 5.2 LTS + **Django Ninja** · Python 3.13 · PostgreSQL (SQLite in dev) · Redis (post-MVP queue/cache) · LLM API (provider-agnostic)
> **v2.2 change:** API framework decision finalized — Django Ninja replaces DRF. Stack rationale added (§B0). Setup instructions live in a separate document (`lmls-setup-guide`).

---

# Part A — Functional Requirements Document (FRD)

## A1. Personas

- **Student** — assignments, exams, group projects.
- **Professional** — meetings, reports, bill payments.
- **Entrepreneur** — investor calls, deliverables, hiring deadlines.

## A2. Feature Requirements (MoSCoW)

| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| F-01 | Task CRUD + deadline tracking | **Must** | Create/edit/delete tasks with title, description, due datetime (tz-aware), priority (1–3), effort estimate (minutes), status, tags. |
| F-02 | AI intelligent prioritization | **Must** | LLM scores every open task 0–100 via urgency × impact ÷ effort; list re-ranks on every task mutation. Deterministic fallback when LLM unavailable. |
| F-06 | Autonomous task decomposition | **Must** | User submits a goal ("Ship MVP by Friday"); LLM decomposes into 2–5 sub-tasks with effort estimates and suggested due datetimes before the parent deadline. |
| F-10 | Rescue Mode | **Must** | One-tap re-plan: LLM redistributes all open tasks across available free slots and returns a revised plan diff for user approval. |
| F-03 | AI scheduling assistant | **Must** | Slots tasks into free calendar windows; "do this next" suggestion. Free slots sourced from calendar integration (F-05) or manual availability input. |
| F-04 | Context-aware reminders | **Should** | Escalating nudges (in-app → push/email → SMS) driven by deadline proximity and user inactivity; pipeline halts when task is marked started. |
| F-05 | Calendar integration (Google/Outlook) | **Should** | OAuth 2.0; bi-directional event read/write; free-slot extraction feeds F-03/F-10. |
| F-08 | Personalized productivity insights | **Could** | Periodic LLM-generated report: completion patterns, bottlenecks, recommendations. |
| F-07 | Goal & habit tracking | **Could** | Streaks, weekly completion %, habit heatmap. |
| F-09 | Voice-enabled assistance | **Won't (v1)** | Web Speech API → STT → intent parse; deferred beyond v1. |

## A3. Non-Functional Requirements

| NFR | Target |
|-----|--------|
| API latency | p95 < 400 ms excluding LLM calls; LLM calls < 3 s with explicit timeout and visible loading states |
| Availability | 99.5 % single-region |
| Auth | JWT (15-min access / 7-day refresh) in httpOnly SameSite cookies — never localStorage; OAuth 2.0 for calendar scopes |
| Transport & storage | TLS 1.3 in transit; AES-256 at rest; calendar OAuth tokens encrypted (Fernet) before persistence |
| Rate limiting | Per-user sliding window on auth and LLM-backed endpoints (protects provider quota and the service) |
| LLM failure mode | Malformed/failed LLM response degrades to deterministic scoring; UI signals degraded mode; no feature hard-fails on LLM outage |
| Observability | 100 % of LLM calls logged (model, tokens, latency, validity); error tracking on both tiers |
| Privacy | PII (email, phone) scrubbed from prompts before dispatch; data-retention posture documented (DPDP-aware) |

## A4. Key User Stories

```
US-1  As a student, I add "ML assignment due Fri 11 PM" and the AI
      breaks it into sub-tasks with suggested time slots.

US-2  As a professional, 30 min before my meeting the app detects I
      haven't started prep and escalates the reminder channel.

US-3  As an entrepreneur, I hit "Rescue Mode" at 6 PM; the AI re-plans
      my remaining tasks and presents the revised schedule for approval.
```

---

# Part B — Technical Specification Document (TSD)

## B0. Stack Rationale — why this stack over the alternatives

The defining property of this application: **it is an LLM-orchestration layer over a relational task store.** The most frequent request type awaits a 3–8 s model call; the data model is classic relational; a solo developer maintains it with heavy AI code generation. Every stack decision below follows from those three facts.

### B0.1 Backend framework: Django + Django Ninja

| Criterion | **Django + Ninja (chosen)** | Django + DRF | FastAPI | Node (Nest/Express) |
|---|---|---|---|---|
| Async request handling | ✅ native `async def` — LLM calls await instead of blocking workers | ⚠️ partial/awkward async | ✅ native | ✅ native |
| Validation model | ✅ **Pydantic v2 — same schemas validate API requests AND LLM responses** (single vocabulary, see B4) | ❌ two parallel systems forever (Serializers + Pydantic) | ✅ Pydantic | ⚠️ zod/class-validator — second vocabulary vs Python LLM layer |
| ORM + migrations + admin | ✅ built-in; admin = free internal dashboard for Task/AIInteraction inspection | ✅ same | ❌ rebuild by hand (SQLAlchemy + Alembic + no admin) | ⚠️ Prisma decent; no admin |
| Auth batteries | ✅ Django auth + `ninja-jwt` | ✅ mature (simplejwt) | ❌ assemble yourself | ⚠️ assemble (Passport etc.) |
| Boilerplate per endpoint | ✅ typed function + schema | ❌ serializer + viewset + router + inheritance magic | ✅ low | ⚠️ medium |
| AI-codegen reliability | ✅ fewer abstractions to get wrong — a Ninja endpoint is a plain typed function | ⚠️ bigger training corpus, but failure surface (serializer/viewset magic) is larger | ✅ similar to Ninja | ⚠️ fine, but splits stack across two languages |
| OpenAPI docs | ✅ built-in `/api/docs` — inspectable artifact out of the box | ⚠️ extra package (drf-spectacular) | ✅ built-in | ⚠️ extra setup |
| Solo-dev maintenance load | ✅ one framework, batteries included | ✅ | ❌ owns glue code for ORM/auth/admin | ❌ second runtime + duplicated validation logic |

**Decision:** Django 5.2 LTS + Django Ninja.
- *Why not DRF:* the two deciding factors are async-first request handling (our hot path is an awaited LLM call) and one validation vocabulary — the Pydantic schemas in the LLM service layer (B4) are reused verbatim as API request/response schemas. DRF would impose synchronous-leaning views plus a permanent dual-validation tax. DRF's larger ecosystem/corpus advantage is outweighed by Ninja's smaller failure surface for AI-generated code: fewer abstractions, plain typed functions.
- *Why not FastAPI:* we keep Django's ORM, migrations, auth, and admin — rebuilding those solo is a bad trade for marginal performance we don't need.
- *Why not Node:* the LLM/data tooling and this codebase's validation layer are Python; a JS backend duplicates every schema across languages.

**Constraint:** do not mix Ninja and DRF in one project — one API framework only.

### B0.2 Frontend: Next.js 16 (App Router)

| Criterion | **Next.js 16 (chosen)** | Vite + React SPA | HTMX/Django templates |
|---|---|---|---|
| Perceived performance | ✅ Server Components ship less JS; streaming/Suspense | ⚠️ full client bundle | ✅ minimal JS |
| Product-grade UI ecosystem | ✅ Tailwind v4 + shadcn/ui first-class | ✅ same | ❌ limited componentry |
| SEO / marketing pages later | ✅ SSR/ISR built-in | ❌ extra work | ✅ |
| Rich interactive islands (rescue diff, re-rank animation) | ✅ client components where needed | ✅ | ❌ awkward beyond simple swaps |

**Decision:** Next.js 16 — the dashboard needs rich interactivity *and* fast first paint; App Router gives both without assembling infrastructure.

### B0.3 Data & infrastructure choices

| Choice | Chosen | Rejected | Why |
|---|---|---|---|
| Database | **PostgreSQL** (SQLite in dev) | MongoDB | Tasks/reminders/goals are relational with FKs and time-range queries; JSONB covers any flexible fields. Dev/prod parity via `DATABASE_URL` swap. |
| Queue/scheduler (F-04) | **django-q2 or Celery Beat + Redis**, post-MVP | Celery-from-day-1, WebSockets-first | Escalation is minute-granularity scheduling, not realtime streaming; defer the operational weight until the feature lands. |
| LLM providers | **Provider-agnostic layer (B4)**: Gemini primary, Groq fast path, Null for degraded mode | Hard-coding one vendor SDK | Free-tier limits and model lineups change monthly; provider is configuration, not code. |
| Hosting (MVP) | **Vercel + Railway/Render** | AWS ECS/ALB/RDS from day 1 | Production AWS topology is a post-validation concern (see B9); solo velocity first. |
| Python tooling | **uv** (lockfile committed) | pip + venv + pyenv | One tool for interpreter pinning, resolution, and reproducible installs; fast CI. |

## B1. Architecture

```
┌──────────────────┐     HTTPS      ┌───────────────────────┐
│  Next.js 16      │◄──────────────►│  Django 5.2 + Ninja   │
│  App Router, TS  │                │  Python 3.13, async   │
│  Tailwind+shadcn │                │  ASGI (uvicorn)       │
│  Vercel          │                └───┬────────┬────────┘
└──────────────────┘                    │          │
                                        ▼          ▼
                                  PostgreSQL     Redis
                                  (tasks, users, (cache, rate-limit,
                                   goals, logs)   task queue broker)
                                        │          │
                                        ▼          ▼
                                  LLM Service   Worker pool (django-q2
                                  Layer (B4)    or Celery: reminders,
                                        │        calendar sync, LLM jobs)
                        ┌─────────────┼─────────────┐
                        ▼             ▼             ▼
                  Gemini API     Groq API     Google/Outlook
                  (primary)     (fast path)   Calendar APIs
```

Principles:

- **Decoupled tiers.** Frontend and API communicate only over versioned HTTPS endpoints (`/api/v1/...`). No shared session state.
- **Provider-agnostic AI.** All model access goes through one service layer (B4); provider is configuration, not code.
- **Graceful degradation.** Every AI-backed capability has a deterministic non-AI fallback path.
- **Async-first request path.** Ninja endpoints are `async def`; LLM calls are awaited with explicit timeouts. Long jobs (reminders, calendar sync) run on workers.

## B2. Data Model

```
User           (id, email, pw_hash [Argon2], tz, llm_provider_pref, created_at)
Task           (id, user_id FK, title, description, due_at [tz-aware],
                priority int, effort_min int, status [todo|started|done],
                parent_task_id FK nullable, ai_score float nullable,
                ai_score_stale bool, tags[], created_at, updated_at)
CalendarEvent  (id, user_id FK, provider, ext_id, title, start, end, synced_at)
Reminder       (id, task_id FK, channel [inapp|push|email|sms],
                send_at, status [pending|sent|halted], escalation_level int)
Goal           (id, user_id FK, title, target_date, status)
HabitLog       (id, user_id FK, habit_id FK, done_at)
AIInteraction  (id, user_id FK, feature, prompt_hash, response_valid bool,
                model, tokens_in, tokens_out, latency_ms, created_at)
```

Notes:

- `ai_score_stale` distinguishes LLM-produced scores from deterministic fallback scores.
- `AIInteraction` stores a **hash** of the prompt (not raw text) plus metrics; raw prompt/response bodies retained only in dev.
- Calendar OAuth tokens stored encrypted (`cryptography.fernet`), never in plaintext columns.

## B3. API Surface (Django Ninja, `/api/v1`)

Routers grouped per domain (`tasks`, `schedule`, `insights`, `auth`); every endpoint an `async def` with Pydantic request/response schemas; interactive OpenAPI docs auto-served at `/api/docs`.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/tasks/` | Create task; `?ai_plan=true` triggers decomposition (F-06) |
| GET | `/tasks/?sort=ai_priority` | List, AI-ranked; deterministic order when degraded |
| PATCH | `/tasks/{id}/` | Update; `status=started` halts the reminder pipeline |
| POST | `/tasks/rank/` | Force re-rank of all open tasks (F-02) |
| POST | `/tasks/rescue/` | Rescue Mode re-plan; returns plan diff, applies on confirm (F-10) |
| POST | `/schedule/suggest/` | Slot suggestions for a date range (F-03) |
| GET | `/insights/weekly/` | LLM productivity report (F-08) |
| POST | `/auth/calendar/connect/` | OAuth redirect flow (F-05) |
| WS | `/ws/reminders/` | Real-time nudges (F-04; requires Channels) |

Contract rules:

- All AI endpoints return `{data, ai_meta: {model, degraded: bool, latency_ms}}` so the client can render degraded-mode UI.
- Mutating endpoints are idempotent where possible (`Idempotency-Key` header on rescue/rank).
- Auth via `ninja-jwt` (same 15-min access / 7-day refresh semantics as A3), tokens delivered in httpOnly SameSite cookies.

## B4. AI Service Layer

```python
# services/llm/client.py — strategy pattern
class LLMClient(ABC):
    @abstractmethod
    async def complete(self, prompt: str, schema: type[BaseModel]) -> BaseModel: ...

class GeminiClient(LLMClient): ...   # google-genai SDK
class GroqClient(LLMClient): ...     # groq SDK
class NullClient(LLMClient): ...     # raises LLMUnavailable (deterministic-only mode)

# selected via settings.LLM_PROVIDER: "gemini" | "groq" | "none"
```

**Schema reuse (the Ninja payoff):** the Pydantic models used as `schema` here are the same classes exposed as Ninja response schemas — one definition validates the model's output and types the API contract.

**Call pipeline (every request):**

1. PII scrub (email/phone patterns) on all user content entering the prompt.
2. Dispatch with explicit timeout (`LLM_TIMEOUT_S`, default 8 s) — never SDK defaults.
3. Validate response against the Pydantic schema.
4. On invalid JSON: one repair retry ("Return valid JSON only"); on second failure raise `LLMUnavailable`.
5. Write `AIInteraction` row on **every** attempt, success or failure.

**Deterministic fallback (on `LLMUnavailable`):**

```
score = (100 / max(hours_to_due, 1)) * priority - effort_min / 30
```

Applied with `ai_score_stale = true`; API responses set `ai_meta.degraded = true`.

**Prompt contracts** (versioned files in `prompts/`, never inline strings):

```
Prioritization:
  System: You are a productivity planner. Return JSON only.
  User:   Tasks: {tasks_json}. Free slots: {slots_json}.
          Now: {now}. TZ: {tz}.
          Score each task 0-100 (urgency×impact÷effort).
          Output: [{"task_id":…,"score":…,"reason":…}]

Decomposition:
  Input: goal title + deadline → Output: [{"title":…,"effort_min":…,"due_at":…}] (2-5 items, all due_at < parent due_at)

Rescue:
  Input: open tasks + free slots + now → Output: [{"task_id":…,"new_due_at":…,"slot":…,"reason":…}] + summary
```

## B5. Evals & Observability

Definition of done for any AI feature:

- Golden test suite per prompt (≥5 cases) asserting ranking **properties**, not exact scores — e.g. overdue task always outranks no-deadline task; higher priority wins at equal deadlines. Runs as pytest in CI with `LLM_PROVIDER=none` stubs plus recorded-response fixtures.
- Pydantic schema validation on 100 % of LLM responses.
- Explicit per-call timeout.
- `AIInteraction` populated on every call; weekly review of `response_valid` rate and latency percentiles.
- Prompts versioned in-repo; rollback to a previous prompt version requires no code deploy (prompt file swap).
- Sentry (or equivalent) on frontend and backend; correlation ID propagated from Next.js request → Ninja endpoint → LLM call log.

## B6. Reminder Escalation Pipeline (F-04)

```
T-24 h → in-app notification
T-2 h  → push + email
T-30 m → SMS (opt-in only)
T-0    → Rescue Mode prompt
Task marked "started" → pipeline halts (Reminder.status = halted)
```

Implementation: scheduler (django-q2 or Celery Beat) enqueues per-task reminder jobs; each job re-checks task status at send time (no stale sends). Channel providers behind an interface (email first; SMS provider pluggable).

## B7. Frontend (Next.js 16, App Router)

| Route | Purpose |
|-------|---------|
| `/dashboard` | Today view: AI-ranked list, score badges + reasons, degraded-mode banner |
| `/tasks/new` | Task form with "Let AI plan it" (decomposition) toggle |
| `/rescue` | Rescue Mode: plan diff (old → new times) + confirm/apply |
| `/insights` | Productivity report |
| `/settings` | Calendar connect, notification prefs, LLM provider preference |

Technical choices:

- Server Components by default; client components only for interactive islands (rescue diff, form toggles).
- **TanStack Query** for server state, **Zustand** for UI state.
- Tailwind v4 + shadcn/ui (Radix primitives); dark mode via CSS variables; `next/font` self-hosted fonts.
- Typed API client generated from Ninja's OpenAPI spec (e.g. openapi-typescript) — contract drift caught at compile time.
- All LLM-backed views render explicit loading and degraded states — no spinner-forever paths.

## B8. Security

- `DEBUG=False` in prod; secrets via environment only (django-environ); `manage.py check --deploy` clean as a release gate.
- HSTS + SSL redirect + secure/httpOnly/SameSite cookies; strict `ALLOWED_HOSTS`; CORS locked to the exact frontend origin.
- JWT via `ninja-jwt`; refresh rotation + blacklist on logout.
- Argon2 password hashing.
- Rate limiting (django-ratelimit, Redis sliding window) on auth and LLM endpoints.
- CSP and security headers set in `next.config`; no `NEXT_PUBLIC_` secrets.
- Server-side validation on every input regardless of client validation (Pydantic schemas at the API boundary).
- Audit log on task mutations (`django-auditlog`).
- PII scrubbing before LLM dispatch; documented data-retention posture (DPDP-aware: what is sent to providers, what is retained, for how long).
- Dependency hygiene: lockfiles committed; `pip-audit` + `npm audit` in CI; Dependabot/Renovate enabled.

## B9. Infrastructure & CI/CD

| Concern | MVP | Scale-up (post-validation) |
|---------|-----|---------------------------|
| Frontend hosting | Vercel | Vercel or S3 + CloudFront |
| API hosting | Railway / Render (ASGI) | ECS Fargate behind ALB |
| Database | Managed Postgres (host-provided) | RDS PostgreSQL |
| Cache / queue | Managed Redis (when F-04 lands) | ElastiCache |
| Secrets | Host env vars | AWS Secrets Manager |
| CI/CD | GitHub Actions: ruff + pytest + pip-audit / eslint + tsc + npm audit → deploy | + ECR/ECS pipeline |
| Monitoring | Sentry free tier + host metrics | + CloudWatch, structured logs |

## B10. Environment Variables

```env
DJANGO_SECRET_KEY=
DATABASE_URL=              # postgres://… (sqlite:///… in dev)
REDIS_URL=                 # required once reminders/queue land
LLM_PROVIDER=gemini        # gemini | groq | none
LLM_TIMEOUT_S=8
GEMINI_API_KEY=
GROQ_API_KEY=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_SECRET=
JWT_SIGNING_KEY=
ALLOWED_HOSTS=
CORS_ALLOWED_ORIGINS=
SENTRY_DSN=
```

## B11. Assumptions & Open Questions

| # | Item |
|---|------|
| 1 | Single-region, single-tenant; no team workspaces in v1. |
| 2 | Email-first escalation; SMS provider pluggable and opt-in. |
| 3 | Voice input excluded from v1 scope. |
| 4 | Offline/PWA behavior deferred; standard responsive web app in v1. |
| 5 | **Q:** Current free-tier models/limits for Gemini and Groq — verify against provider docs before key issuance; treat any model names in docs as provisional. |
