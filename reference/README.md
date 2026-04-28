# Reference Files

This directory contains the existing Just Do prototype and design references.

## Main Reference

`proto/` is the primary source to inspect for app behavior:

- `proto/store.jsx`: local prototype state, Task/Habit sample data, date helpers
- `proto/home.jsx`: interactive calendar, selected-day list, task/habit toggles
- `proto/sheet-detail.jsx`: add/edit bottom sheet and task detail screen
- `proto/stats-settings.jsx`: stats and settings tabs
- `proto/tabbar.jsx`: interactive tab bar
- `proto/app.jsx`: prototype root

Run/view with:

```text
interactive-prototype.html
```

## Supporting Design Reference

`screens/` contains static design compositions used by:

```text
design-board.html
```

These files are useful for visual direction, but implementation decisions should primarily follow `proto/`.
