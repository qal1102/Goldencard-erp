# GoldenCard ERP Agent Instructions

## Project Stack And Purpose

- GoldenCard ERP is a production-oriented internal ERP for GoldenCard's solar, installation, and service workflow, covering CRM, customers, surveys, quotations, contracts, inventory, work orders, handover, warranty, CSKH, and user management.
- Treat this as a Next.js project with breaking-version caveats: before changing Next.js APIs, conventions, routing, or file structure, read the relevant guide in `node_modules/next/dist/docs/`.
- Use existing project patterns and `docs/` files as the source of truth for business behavior, module scope, and writing conventions.
- Prefer small, targeted diffs that solve the requested task without unrelated refactors.

## Production Safety

- Do not deploy production unless the user explicitly approves.
- Do not run production `db:migrate` unless the user explicitly approves.
- Do not reset, drop, truncate, or otherwise destructively modify the production database.
- Do not expose secrets, database URLs, credentials, tokens, or `password_hash` values in code, logs, UI, docs, commits, or responses.
- Do not change database pool max without explicit approval.

## Business Workflow

- Preserve the GoldenCard ERP business workflow documented in `docs/01-business-rules.md`.
- Keep workflow state transitions, approvals, role boundaries, and validations aligned with the documented business rules.
- Do not invent new operational flows, statuses, reports, dashboards, or audit surfaces unless explicitly requested.
- Never create audit UI, canvas, or report pages unless explicitly requested.

## Super Admin And Users

- Keep the Super Admin guard intact.
- Keep disabled-user blocking intact.
- Do not weaken user-management permission checks, role checks, or account-status checks.
- Avoid exposing sensitive user fields, especially `password_hash`.

## Data Loading

- For list pages, use server `initialData` when practical.
- Use stable query keys.
- Use explicit limits and pagination for list data.
- Provide empty states and error states.
- Do not use infinite skeleton loading.

## Database And Migrations

- Do not run production `db:migrate` unless the user explicitly approves.
- Do not reset, drop, truncate, or destructively rewrite production data.
- Do not expose database URLs, secrets, credentials, tokens, or `password_hash` values.
- Keep migrations narrow, reviewable, and aligned with documented business rules.

## Deployment

- Do not deploy production unless the user explicitly approves.
- Use `npx vercel --prod` only after explicit production-deploy approval.
- Do not treat preview/local deployment approval as production deployment approval.

## Testing

- Always run `npm run build` after code changes.
- Run existing tests when relevant to the changed area.
- If tests or builds cannot be run, report the reason clearly.
