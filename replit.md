# QC Task Manager

QC Task Manager helps quality-control teams schedule checks, manage the work queue, and see live operational status from one dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/qc-task-manager/` — React/Vite dashboard and task queue UI
- `artifacts/api-server/src/routes/tasks.ts` — task CRUD, dashboard summary, and system status routes
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/db/src/schema/tasks.ts` — source-of-truth task table schema
- `artifacts/qc-task-manager/src/index.css` — application theme and visual tokens

## Architecture decisions

- The frontend uses generated React Query hooks from the OpenAPI contract rather than hand-written API clients.
- Scheduled tasks are persisted in PostgreSQL and use `pending` / `completed` status to represent the work queue.
- Dashboard summaries and live system status are separate read endpoints so the UI can poll lightweight operational data.
- Browser reminders are user-controlled: permission is requested from the notification button, while an in-app reminder remains available when browser notifications are unavailable.

## Product

- Schedule quality checks with a title and date/time.
- Edit, reschedule, complete, delete, search, and filter tasks.
- View total, open, completed, overdue, and upcoming work.
- Monitor API status, response time, queue depth, and the next scheduled check.
- Receive a timed reminder when an open task becomes due.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`.
- Use the managed API and web workflows rather than starting services with root-level dev commands.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
