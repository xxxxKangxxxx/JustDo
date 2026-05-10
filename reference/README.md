# Reference Files

This directory contains the existing Just Do prototype and design references.

Per the Platform Strategy decision (2026-05-10, see `docs/just_do_prd.md` §1.5),
mobile and desktop targets follow **different** UI references:

- `proto/` → **mobile/iOS** reference (also used by Android in v3).
- `web-proto/` → **desktop web** reference (to be added).

The shared domain model (Task, Habit, Category, Settings) and Supabase schema
are common across both platforms; only the UI/UX layer diverges.

## Mobile / iOS Reference (`proto/`)

`proto/` is the primary source to inspect for **iOS** (and future Android) app
behavior. It assumes mobile form factor (≤ ~480px width, bottom tab bar, etc.).

- `proto/store.jsx`: local prototype state, Task/Habit sample data, date helpers
- `proto/home.jsx`: interactive calendar, selected-day list, task/habit toggles
- `proto/sheet-detail.jsx`: add/edit bottom sheet and task detail screen
- `proto/stats-settings.jsx`: stats and settings tabs
- `proto/tabbar.jsx`: interactive tab bar
- `proto/auth.jsx` / `proto/auth-button.jsx`: signed-out auth landing
- `proto/app.jsx`: prototype root

Run/view with:

```text
interactive-prototype.html
```

## Desktop Web Reference (`web-proto/`)

`web-proto/` will host the desktop-native web prototype (sidebar nav,
multi-pane layout, keyboard shortcuts, etc.). The web app under `apps/web/`
should follow this reference, not `proto/`.

Until `web-proto/` is populated, the web app is in a transitional state
mirroring the mobile prototype; see `docs/next_steps.md` Phase 7 for the
redesign track.

## Supporting Design Reference

`screens/` contains static design compositions used by:

```text
design-board.html
```

These files are useful for visual direction, but implementation decisions
should primarily follow the platform-appropriate prototype directory.
