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
