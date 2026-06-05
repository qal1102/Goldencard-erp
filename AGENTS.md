# GoldenCard ERP Agent Instructions

## Project
GoldenCard ERP is an internal solar / installation / service workflow ERP.
Main workflow: CRM Lead -> Customer -> Survey -> Quotation -> Contract -> Inventory/BOM -> Work Order -> Installation/Handover -> Warranty/Customer Service.
UI language is Vietnamese.

## Safety Rules
- Do not run production db:migrate without explicit user approval.
- Do not deploy to production without explicit user approval.
- Do not drop, truncate, reset, or destructively modify production data.
- Do not expose secrets, DATABASE_URL, tokens, password hashes, or .env values.
- Do not change DB pool max without explicit user approval.
- Do not broad-refactor the app.
- Do not optimize the whole app in one task.
- Fix one route, one bug, or one small workflow at a time.

## Auth / Security
- Preserve Auth.js v5 credentials auth.
- Preserve JWT session behavior.
- Preserve Super Admin guard.
- Preserve disabled/inactive user blocking.
- Only Super Admin may manage users/roles/password reset/lock/unlock.
- Never allow Super Admin to lock themselves.
- Do not create a second Super Admin through UI/API.

## DB / Supabase
- The app uses Supabase only as Postgres via DATABASE_URL.
- Do not add Supabase JS/API key dependency unless explicitly requested.
- Production migration history may be unreliable.
- Before any schema change, inspect real tables/columns first.
- Prefer safe SQL IF NOT EXISTS only after approval.

## Frontend / Loading
- Avoid infinite skeleton/loading states.
- Prefer server initialData for important list pages when practical.
- React Query hooks with initialData must not refetch immediately on mount.
- Use stable primitive query keys.
- Add bounded loading, empty, and error states.
- Serialize Date/nested DB data before sending to client.
- Avoid unsafe SelectItem value="" with Base UI / shadcn Select.

## Testing
- Run npm run lint and npm run build after code changes.
- If tests fail, report the failure and do not deploy.
- Do not commit ignored/local/build files:
  .env.local, .vercel, .next, node_modules, tsconfig.tsbuildinfo.

## Workflow
- Review current diff before committing.
- Keep commits small and focused.
- If asked to audit, do not edit files.
- If asked to fix, edit only files directly needed for that task.
