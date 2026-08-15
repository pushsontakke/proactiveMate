# proactiveMate — Setup Guide (Windows / WSL2)

> **Version:** 1.1 · **Applies to:** The Last-Minute Life Saver
> **Stack (committed, see TSD v2.2 §B0 for rationale):** Next.js 16 · Django 5.2 LTS + **Django Ninja** · Python 3.13 · PostgreSQL · Docker
> **Machine verdict: WSL2 (Ubuntu 24.04), not pure Windows.**
> This document is setup-only. Architecture, framework comparisons, and stack rationale live in the TSD/FRD document.

---

## 1. Why WSL2 (summary — full comparison in TSD §B0 context)

- **Prod parity:** production is Linux (Railway/Render/Docker); dev on the same OS eliminates path/FS/signal surprises.
- **Python ecosystem:** C-extension packages (psycopg, cryptography, argon2-cffi) always have working Linux wheels.
- **Docker Desktop runs on the WSL2 backend anyway** — your tools should live where the engine lives.
- **AI-generated code assumes Linux conventions** — on pure Windows you become the translation layer.

**Golden rule:** the repo lives in the Linux filesystem (`~/code/proactiveMate`), **never** `/mnt/c/...`. Cross-OS file access is 10–20× slower and breaks file watchers/HMR.

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
- **VS Code** + **WSL extension** — open projects with `code .` from inside WSL (badge must read "WSL: Ubuntu")

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

---

## 3. Repository layout

```
proactiveMate/
├─ backend/            # Django 5.2 LTS + Django Ninja
│  ├─ config/          # settings, asgi.py
│  ├─ apps/tasks/      # Task, AIInteraction models + api.py (Ninja router)
│  ├─ services/llm/    # LLMClient strategy layer (Pydantic schemas shared with API)
│  ├─ prompts/         # versioned prompt files
│  ├─ pyproject.toml   # uv-managed; uv.lock committed
│  └─ Dockerfile
├─ frontend/           # Next.js 16, App Router, TS, Tailwind v4
│  └─ Dockerfile
├─ docker-compose.yml
├─ .env.example        # committed; .env never committed
└─ docs/               # TSD/FRD v2.2 + this guide
```

---

## 4. Project setup

### 4.1 Backend (Django + Ninja)

```bash
mkdir -p ~/code/proactiveMate && cd ~/code/proactiveMate
uv init backend && cd backend
uv add "django>=5.2,<6" django-ninja django-ninja-jwt \
       django-cors-headers django-environ django-ratelimit django-auditlog \
       "psycopg[binary]" argon2-cffi cryptography pydantic \
       gunicorn "uvicorn[standard]"
uv add --dev ruff pytest pytest-django pytest-asyncio pip-audit
uv run django-admin startproject config .
uv run python manage.py migrate
uv run python manage.py runserver   # http://localhost:8000
```

```python
#Create it in this order:
mkdir -p apps/tasks
touch apps/__init__.py
uv run python manage.py startapp tasks apps/tasks
​
#Then edit apps/tasks/apps.py so the name reflects the nested path:
class TasksConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.tasks"          # ← was "tasks"; must match the import path
​
#Register it in config/settings.py:
INSTALLED_APPS = [
    # ... django defaults ...
    "ninja_jwt",
    "apps.tasks",
]
```

Ninja wiring (reference):

```python
#apps/tasks/api.py
from ninja import Router

router = Router(tags=["tasks"])

@router.get("/ping/")
async def ping(request):
    return {"status": "ok"}

# config/api.py
from ninja import NinjaAPI
from apps.tasks.api import router as tasks_router

api = NinjaAPI(title="proactiveMate API", version="1", docs_url="/docs")
api.add_router("/tasks/", tasks_router)

# config/urls.py
from django.contrib import admin
from django.urls import path
from .api import api

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", api.urls),      # interactive docs at /api/v1/docs
]
```

```python
#Then open pyproject.toml — if there's a [build-system] section, delete it too, or add this so uv treats the project as an app, not an installable package:
[tool.uv]
package = false

#(If uv sync runs clean afterward, you're done.)
```

### Notice: when you get to Docker, change the base images from python:3.13-slim to python:3.14-slim in the Dockerfile. Because in project python 3.14 is in use.

Endpoints are `async def` functions on routers; request/response schemas are the same Pydantic models used by the LLM service layer (TSD §B4).

### 4.2 Frontend (Next.js 16)

```bash
cd ~/code/proactiveMate
npx create-next-app@latest frontend --typescript --tailwind --app --turbopack
cd frontend
npx shadcn@latest init
npm run dev                          # http://localhost:3000
```

Add to `next.config.ts` when Docker builds begin: `output: "standalone"`.

Optional but recommended — generate a typed client from Ninja's OpenAPI spec:

```bash
npx openapi-typescript http://localhost:8000/api/v1/openapi.json -o lib/api-types.ts
```

### 4.3 Keeping packages current and non-vulnerable

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

## 5. Docker

**Dev usage:** containerize **Postgres + Redis only**; run Django and Next directly in WSL for fast reload/HMR. Full containerized run is a pre-deploy parity check.
**Prod usage:** the two Dockerfiles below are the deployable artifacts.

### 5.1 `backend/Dockerfile` (multi-stage, non-root)

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

### 5.2 `frontend/Dockerfile` (standalone output)

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

### 5.3 `docker-compose.yml` (dev)

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: proactiveMate
      POSTGRES_USER: proactiveMate
      POSTGRES_PASSWORD: proactiveMate # dev only — never reuse in prod
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

### 5.4 `.dockerignore` (both apps)

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

### 5.5 Daily workflow

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

## 6. Stability checklist

- [ ] Repo in `~/code/...` (ext4), never `/mnt/c`
- [ ] `git config core.autocrlf input` set (no CRLF corruption)
- [ ] `.wslconfig` in `C:\Users\<you>\` if RAM-constrained: `[wsl2]` / `memory=6GB`
- [ ] Docker Desktop WSL integration enabled for the Ubuntu distro
- [ ] VS Code opened via `code .` from inside WSL (badge: "WSL: Ubuntu")
- [ ] `uv.lock` + `package-lock.json` committed; Dependabot on
- [ ] `.env` never committed; `.env.example` kept current
- [ ] `manage.py check --deploy` clean before any deploy
