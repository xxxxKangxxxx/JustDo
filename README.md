# Just Do

This repository currently holds planning documents and frontend reference prototypes for the Just Do app.

## Current Focus

- Primary reference: `reference/proto/`
- Interactive prototype: `reference/interactive-prototype.html`
- Design board: `reference/design-board.html`
- Product documents: `docs/`

## Implementation Direction

The existing files are references. When app development starts, create a new implementation directory instead of building directly inside `reference/`.

Recommended future structure:

```text
apps/
  web/
  ios/
docs/
reference/
```

Use `reference/proto/` as the main behavior and UI reference. Use `reference/screens/` only as static design support.

## Web App

The first implementation target lives in `apps/web/`.

```bash
npm install
npm run dev:web
```

## Local Supabase

Local development uses the Supabase CLI stack under `supabase/`.

```bash
supabase start
```

To clear local test accounts and app data without resetting migrations:

```bash
npm run db:reset-local-app-data
```

See `docs/local_dev.md` for the local reset procedure and browser data notes.

## iOS App

The iOS track starts in `apps/ios/`.

Current iOS files are planning/contracts only:

- Swift domain model mirror
- Swift mutation queue schema
- Phase 6 iOS/Core Data/App Group plan

See `docs/ios_phase6_plan.md`.
