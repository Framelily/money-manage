# CLAUDE.md

Monorepo for the money-manage personal finance app. Thai-language UI, Thai Baht,
Buddhist Era dates.

## Layout

| Path | What |
|------|------|
| `apps/web` | React + TypeScript + Vite SPA. See `apps/web/CLAUDE.md` |
| `apps/api` | Go + Gin REST API, serves the built SPA. See `apps/api/CLAUDE.md` |
| `docs/superpowers` | Specs and implementation plans |

## How to run

```bash
cd apps/web && npm install && npm run dev   # frontend on :5173
cd apps/api && go run .                     # API on :8080

./deploy.sh                                 # build frontend + start containers
```

## Deployment

One workflow, `.github/workflows/deploy.yml`, runs on push to `main` against a
self-hosted runner: pull, build `apps/web`, `docker compose up -d --build`.
Compose mounts `apps/web/dist` into the API container, which serves it as the
SPA. Exposed through a Cloudflare Tunnel.

**A push to `main` is a production deploy.**

## Conventions

- All UI text in Thai; code, comments, and commit messages in English
- Conventional commits, subject ≤72 chars
- Changes spanning both apps belong in one commit — that is the point of the monorepo
