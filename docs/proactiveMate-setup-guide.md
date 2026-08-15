# proactiveMate — Setup Guide (Windows / WSL2)

> **Version:** 1.2 · **Applies to:** The Last-Minute Life Saver (proactiveMate)
> **Stack (committed, see TSD v2.2 §B0 for rationale):** Next.js 16 · Django 5.2 LTS + **Django Ninja** · Python 3.13/3.14 · PostgreSQL · Docker
> **Machine verdict: WSL2 (Ubuntu 24.04), not pure Windows.**
>
> **v1.2:** battle-tested revision. Every step below now includes the fixes discovered during the first real setup: correct PyPI package names, `uv init` leftover cleanup, Python version pinning, nested-app wiring, VS Code interpreter selection, and git hygiene. Follow it top to bottom and none of those errors will occur.

---

## 1. Why WSL2 (summary)

- **Prod parity:** production is Linux (Railway/Render/Docker); dev on the same OS eliminates path/FS/signal surprises.
- **Python ecosystem:** C-extension packages (psycopg, cryptography, argon2-cffi) always have working Linux wheels.
- **Docker Desktop runs on the WSL2 backend anyway** — your tools should live where the engine lives.
- **AI-generated code assumes Linux conventions** — on pure Windows you become the translation layer.

**Golden rule:** the repo lives in the Linux filesystem (e.g. `~/code/` or `~/vibe2ship/`), **never** `/mnt/c/...`. Cross-OS file access is 10–20× slower and breaks file watchers/HMR.

---

## 2. One-time machine setup

### 2.1 Windows side (PowerShell as Administrator)

```powershell
wsl --install -d Ubuntu-24.04
# after reboot:
wsl -l -v        # must show VERSION 2
```

Install on Windows:

- **Windows Terminal** — set default profile to Ubuntu
- **Docker Desktop** — Settings → General → "Use the WSL 2 based engine"; Resources → WSL Integration → enable Ubuntu-24.04
- **VS Code** + **WSL extension** — always open projects with `code .` from inside WSL (bottom-left badge must read "WSL: Ubuntu")

### 2.2 Ubuntu side (first shell)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential git curl unzip pkg-config libpq-dev

git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global core.autocrlf input     # Linux line endings

# uv — Python interpreter + package manager (replaces pyenv/pip/venv)
curl -LsSf https://astral.sh/uv/install.sh | sh
uv python install 3.13

# fnm — Node version manager
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 24 && fnm default 24

# sanity
uv --version && node -v && docker ps
```

> `docker ps` failing = Docker Desktop not running or WSL integration not enabled.

> **How uv works — read this once, save hours:** you never activate a virtualenv manually. `uv add` auto-creates `.venv/` in the project and installs into it; `uv run <cmd>` always executes inside that `.venv`, activated or not. Prefix every project command with `uv run`. (A classic `source .venv/bin/activate` also works if you prefer, but is never required.)

---

## 3. Repository layout & git rules

**One product = one repo.** The git root is the product folder itself — never a parent "workspace" folder holding multiple projects. Folders group projects; repos version them.

```
proactiveMate/            ← git root (backend + frontend + docs = ONE product)
├─ .gitignore             ← at the ROOT, covers both stacks (see §8.1)
├─ backend/               # Django 5.2 LTS + Django Ninja
│  ├─ config/             # project: settings.py, urls.py, api.py, asgi.py
│  ├─ apps/               # all Django apps live under this package
│  │  ├─ __init__.py      # REQUIRED — makes "apps" importable
│  │  └─ tasks/           # app: models.py, api.py (Ninja router), admin.py
│  ├─ services/llm/       # LLMClient strategy layer (added later)
│  ├─ prompts/            # versioned prompt files (added later)
│  ├─ pyproject.toml / uv.lock / .venv/ / .python-version
│  └─ Dockerfile
├─ frontend/              # Next.js 16, App Router, TS, Tailwind v4
│  └─ Dockerfile
├─ docker-compose.yml
├─ .env.example           # committed; .env never committed
└─ docs/                  # TSD/FRD v2.2 + this guide
```

---

## 4. Backend setup (step by step, fixes baked in)

### 4.1 Init the project and clean up `uv init` leftovers

```bash
mkdir -p ~/code/proactiveMate && cd ~/code/proactiveMate
uv init backend && cd backend
```

`uv init` scaffolds for a Python *library*, which Django doesn't want. Immediately:

1. **Delete the sample source folder** if it created one:
   ```bash
   rm -rf src/ main.py
   ```
2. **Edit `pyproject.toml`:**
   - Delete the `[project.scripts]` section entirely (e.g. `backend = "backend:main"`) — it points at the deleted folder and causes a `uv sync` warning about entry points.
   - Delete any `[build-system]` section, **or** add:
     ```toml
     [tool.uv]
     package = false
     ```
3. Verify: `uv sync` must run **with no warnings**. (It may say `Uninstalled 1 package: backend==0.1.0` once — that's correct: it removed the fake library.)

### 4.2 Pin the Python version explicitly

uv grabs the newest interpreter it knows (it may pick **3.14** even if you installed 3.13). Django 5.2 supports Python 3.14 **as of patch 5.2.8**, so either is fine — but pin ONE and use it everywhere (dev, CI, Docker base image):

```bash
uv python pin 3.13        # or 3.14 — writes .python-version
rm -rf .venv && uv sync   # rebuild .venv on the pinned version (seconds)
```

> Whatever you pin here must match the Dockerfile base image (`python:3.13-slim` or `python:3.14-slim`, §9.1). Mixed interpreters between dev and prod is where real pain comes from.

### 4.3 Install packages — exact names matter

```bash
uv add "django>=5.2,<6" django-ninja django-ninja-jwt \
       django-cors-headers django-environ django-ratelimit django-auditlog \
       "psycopg[binary]" argon2-cffi cryptography pydantic \
       gunicorn "uvicorn[standard]"
uv add --dev ruff pytest pytest-django pytest-asyncio pip-audit
```

⚠️ **Install name vs import name.** PyPI names use hyphens; Python imports use underscores. They are often different:

| Install (`uv add`) | Import in code | INSTALLED_APPS |
|---|---|---|
| `django-ninja` | `import ninja` | — |
| `django-ninja-jwt` (NOT `ninja-jwt` — that name doesn't exist on PyPI) | `import ninja_jwt` | `"ninja_jwt"` |

> `django-ninja-jwt` also pulls in `django-ninja-extra`. You can use its `NinjaJWTDefaultController` with `NinjaExtraAPI`, or stay on plain `NinjaAPI` routers as this guide does — both are officially supported.

> If `uv add` ever fails resolution, **do not** use the `--frozen` hint — it skips resolution and leaves the project broken. Fix the package name instead.

### 4.4 Verify the install (the right way)

⚠️ Do **not** test with a bare `python -c "import ninja"` — django-ninja reads Django settings at import time and will crash with `ImproperlyConfigured` outside a project. That crash does *not* mean the install failed. Use one of these instead:

```bash
uv pip list | grep -Ei "django|ninja|pydantic"          # simplest
uv run python -c "import django; print(django.get_version())"   # must be >= 5.2.8 if on Python 3.14
```

### 4.5 Create the Django project

```bash
uv run django-admin startproject config .
uv run python manage.py migrate
uv run python manage.py runserver   # http://localhost:8000 — rocket page = OK; Ctrl+C
```

### 4.6 Create the nested `apps/tasks` app — three wiring steps, all required

```bash
mkdir -p apps/tasks
touch apps/__init__.py                                # makes "apps" a package
uv run python manage.py startapp tasks apps/tasks
rm apps/tasks/views.py                                # Ninja uses api.py, not views.py
```

**Step 1 — fix the app name** in `apps/tasks/apps.py` (the #1 silent breaker with nested apps):

```python
class TasksConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.tasks"          # ← was "tasks"; must match the import path
```

**Step 2 — register apps** in `config/settings.py`:

```python
INSTALLED_APPS = [
    # ... django defaults ...
    "ninja_jwt",
    "apps.tasks",
]
```

**Step 3 — create the router** `apps/tasks/api.py` (this file must exist before `config/api.py` can import it):

```python
from ninja import Router

router = Router(tags=["tasks"])

@router.get("/ping/")
async def ping(request):
    return {"status": "ok"}
```

### 4.7 Wire the API — `config/api.py` and `config/urls.py`

```python
# config/api.py
from ninja import NinjaAPI
from apps.tasks.api import router as tasks_router

api = NinjaAPI(title="proactiveMate API", version="1", docs_url="/docs")
api.add_router("/tasks/", tasks_router)
```

⚠️ **No trailing comma** after `NinjaAPI(...)`. In Python `api = NinjaAPI(...),` creates a **tuple**, and you'll get `Cannot access attribute "add_router" for class "tuple[NinjaAPI]"`.

```python
# config/urls.py
from django.contrib import admin
from django.urls import path
from .api import api

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", api.urls),      # interactive docs at /api/v1/docs
]
```

### 4.8 The backend gate ✅

```bash
uv run python manage.py runserver
```

Open **`http://localhost:8000/api/v1/docs`**. If the OpenAPI page renders with `/tasks/ping/` listed, the entire chain is verified: pinned interpreter → .venv → nested app → ninja → routing. Scaffold done.

---

## 5. VS Code / Pylance (fixes "Import \"ninja\" could not be resolved")

That message is the **editor's linter**, not Python — code can run fine with `uv run` while squiggles show. Cause: VS Code is analyzing with the wrong interpreter.

1. Open VS Code from inside WSL at the backend folder: `cd ~/code/proactiveMate/backend && code .` (badge: **WSL: Ubuntu**).
2. `Ctrl+Shift+P` → **Python: Select Interpreter** → pick `./.venv/bin/python`.
3. Squiggles disappear.

> If you open the repo root as the workspace instead, select `backend/.venv/bin/python` as interpreter. Note `from apps.tasks.api import ...` only resolves once that file actually exists (§4.6 step 3).

---

## 6. Frontend setup (Next.js 16)

```bash
cd ~/code/proactiveMate
npx create-next-app@latest frontend --typescript --tailwind --app --turbopack
cd frontend
npx shadcn@latest init
npm run dev                          # http://localhost:3000
```

> If `frontend/` already exists it must be completely empty (check hidden files with `ls -la`); otherwise `rm -rf frontend` first.

Add to `next.config.ts` when Docker builds begin: `output: "standalone"`.

Optional but recommended — generate a typed client from Ninja's OpenAPI spec:

```bash
npx openapi-typescript http://localhost:8000/api/v1/openapi.json -o lib/api-types.ts
```

---

## 7. Keeping packages current and non-vulnerable

```bash
# backend
uv lock --upgrade && uv run pip-audit
# frontend
npx npm-check-updates -u && npm install && npm audit
```

- Commit `uv.lock` and `package-lock.json`.
- Enable Dependabot/Renovate on the repo.
- CI on every PR: `ruff check` + `pytest` + `pip-audit` (backend); `eslint` + `tsc --noEmit` + `npm audit` (frontend).

---

## 8. Git hygiene

### 8.1 Root `.gitignore` — create it BEFORE the first commit

One file at the repo root covers both stacks at any depth:

```gitignore
# Python
__pycache__/
*.pyc
.venv/
db.sqlite3

# env & secrets
.env
.env.*
!.env.example

# Node / Next
node_modules/
.next/

# misc
.DS_Store
```

`__pycache__/` folders are auto-generated bytecode caches — never delete them manually (they come back on the next run) and never commit them. The single ignore line handles every app, present and future.

### 8.2 If junk files were already committed (pycache showing as "M" in Source Control)

`.gitignore` does **not** apply to files git already tracks. Untrack once — files stay on disk:

```bash
cd <repo root>
git ls-files | grep -E "__pycache__|\.pyc$|db\.sqlite3"   # diagnose: what's tracked?
git rm -r --cached .        # untracks EVERYTHING from the index (disk untouched)
git add .                   # re-adds all files — this time .gitignore applies
git status                  # pycache/db.sqlite3 must not appear
git commit -m "chore: re-apply gitignore"
```

What you'll see and why it's fine:

- `git rm -r --cached .` prints `rm '<file>'` for every tracked file — that means "stopped tracking," **not** deleted; every file is still on disk.
- VS Code shows untracked-but-kept files as **D** once — that's "deleted from git's index," not from disk.
- `git rm file` (no `--cached`) deletes from disk AND git; `git rm --cached file` removes from git only. Know the difference before pressing Enter.

### 8.3 Repo scope rules

- **One product = one repo.** backend + frontend + docs of the same product belong together (atomic commits, one API contract, one CI). Two different products never share a repo (independent deploys, visibility, licenses, history).
- The git root must be the **product folder**, not a parent workspace folder — check with `git rev-parse --show-toplevel`.
- Prefix commits by area: `backend: add task model`, `frontend: dashboard skeleton`, `docs: update TSD`.
- Keep `main` always deployable; do daily work on a dev branch and merge at stable points.

---

## 9. Docker

**Dev usage:** containerize **Postgres + Redis only**; run Django and Next directly in WSL for fast reload/HMR. Full containerized run is a pre-deploy parity check.
**Prod usage:** the two Dockerfiles below are the deployable artifacts.

### 9.1 `backend/Dockerfile` (multi-stage, non-root)

> The base image tag must match your pinned `.python-version` (§4.2): `python:3.13-slim` or `python:3.14-slim`.

```dockerfile
# ---- build stage ----
FROM python:3.13-slim AS build
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY . .
RUN uv sync --frozen --no-dev

# ---- runtime stage ----
FROM python:3.13-slim
RUN useradd --create-home appuser
WORKDIR /app
COPY --from=build --chown=appuser:appuser /app /app
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health/')" || exit 1
CMD ["gunicorn", "config.asgi:application", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000", "--workers", "2"]
```

### 9.2 `frontend/Dockerfile` (standalone output)

```dockerfile
# ---- deps ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
```

### 9.3 `docker-compose.yml` (dev)

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: proactiveMate
      POSTGRES_USER: proactiveMate
      POSTGRES_PASSWORD: proactiveMate   # dev only — never reuse in prod
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U proactiveMate"]
      interval: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api:
    build: ./backend
    env_file: .env
    environment:
      DATABASE_URL: postgres://proactiveMate:proactiveMate@db:5432/proactiveMate
      REDIS_URL: redis://redis:6379/0
    ports: ["8000:8000"]
    depends_on:
      db: { condition: service_healthy }

  # optional — usually run `npm run dev` directly in WSL instead
  web:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    ports: ["3000:3000"]
    depends_on: [api]
    profiles: ["full"]

volumes:
  pgdata:
```

### 9.4 `.dockerignore` (both apps)

```
.git
.venv
node_modules
.next
__pycache__
*.pyc
.env*
!.env.example
db.sqlite3
```

### 9.5 Daily workflow

```bash
# terminal 1 — services only
docker compose up db redis
# terminal 2 — backend on host (fast reload)
cd backend && uv run python manage.py runserver
# terminal 3 — frontend on host (fast HMR)
cd frontend && npm run dev

# pre-deploy parity check (full containers):
docker compose --profile full up --build
```

---

## 10. Stability checklist

- [ ] Repo in `~/...` (ext4), never `/mnt/c`
- [ ] Git root = product folder (`git rev-parse --show-toplevel`)
- [ ] `git config core.autocrlf input` set (no CRLF corruption)
- [ ] `.python-version` pinned; matches Dockerfile base image
- [ ] `pyproject.toml` has no `[project.scripts]` / library leftovers; `uv sync` warning-free
- [ ] Root `.gitignore` in place before first commit; no pycache/db.sqlite3/.venv tracked
- [ ] `.wslconfig` in `C:\Users\<you>\` if RAM-constrained: `[wsl2]` / `memory=6GB`
- [ ] Docker Desktop WSL integration enabled for the Ubuntu distro
- [ ] VS Code opened via `code .` from inside WSL; interpreter = `./.venv/bin/python`
- [ ] `uv.lock` + `package-lock.json` committed; Dependabot on
- [ ] `.env` never committed; `.env.example` kept current
- [ ] `manage.py check --deploy` clean before any deploy
- [ ] Gate: `http://localhost:8000/api/v1/docs` renders before starting frontend work
