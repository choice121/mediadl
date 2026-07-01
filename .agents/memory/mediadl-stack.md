---
name: mediadl stack decisions
description: Key architecture decisions and gotchas for the mediadl self-hosted downloader project
---

## Stack
- Backend: `artifacts/api-server` — Express 5, TypeScript ESM, Drizzle + Postgres, yt-dlp-exec, esbuild
- Frontend (active): `artifacts/ytdl` — React + Vite, served at `/` root
- Frontend (dormant): `artifacts/media-dl` — same stack at `/media-dl/`, kept registered but don't develop
- Shared: `lib/db` (Drizzle schema), `lib/api-spec` (OpenAPI → Orval codegen), `lib/api-client-react`, `lib/api-zod`

## Codegen workflow
- Edit `lib/api-spec/openapi.yaml`, then run `pnpm --filter @workspace/api-spec run codegen`
- api-zod/src/index.ts must re-export from `./generated/api` (Zod schemas) and `export type` from individual `./generated/types/*` files — do NOT `export * from "./generated/types"` because Zod const names collide with TS interface names
- Generated schema names (e.g. `BatchCreateDownloadsBody`) may differ from route code expectations — always grep generated api.ts after codegen

## esbuild constraints (api-server)
- `zod` must be an explicit dependency in api-server/package.json (`zod: "catalog:"`) — it is NOT auto-available even if workspace deps use it
- `zod/v4` subpath cannot be resolved by esbuild — always import from `"zod"` directly in api-server source

## Auth
- Session-based (express-session). `ADMIN_PASSWORD` env var gates auth. If unset → all traffic allowed (dev mode)
- SESSION_SECRET env var is required for secure session signing; falls back to hardcoded string in dev
- session.d.ts augments `SessionData` with `authenticated: boolean` — use `req.session.authenticated` directly, never cast `req.session` to `Record<string, unknown>`

## Channel / playlist enumeration
- `enumeratePlaylistUrls()` uses `--flat-playlist --print webpage_url` (NOT `--print url` — that can return non-HTTP IDs for some extractors)
- `isChannelOrPlaylistUrl()` pattern-matches on URL shape; edge cases exist for unusual hosts

## Scheduler (node-cron)
- node-cron does not expose a "next run" API. `computeNextRun()` uses a minute-by-minute walk up to 8 days ahead
- `nextRunAt` DB column is set after each run; initialized to null on schedule creation

## GitHub push
- gitPush() callback returns NO_CREDENTIALS in this repl
- Use: `git push "https://choice121:$GITHUB_TOKEN@github.com/choice121/mediadl.git" HEAD:main`

## yt-dlp path
- `getYtDlpPath()` probes several locations; `pip install yt-dlp` installs to `/home/runner/workspace/.pythonlibs/bin/yt-dlp`
