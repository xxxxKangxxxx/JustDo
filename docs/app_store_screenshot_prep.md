# App Store Screenshot Prep

This is the working checklist for screenshot and App Review demo data.

## Demo Account

Use a dedicated account, not a personal account.

Recommended:

- Google account: `kangym071900@gmail.com`.
- Sign in once on `justdo.co.kr` or the iOS app so Supabase creates the auth user.
- Keep the password only in the owner's password manager.
- Add the account credentials to App Store Connect review notes only at submission time.

Apple Sign-In can also be reviewed directly, but a Google demo account is useful
as a fallback for App Review.

## Seed Data

After the demo account has signed in once:

1. Open hosted Supabase SQL Editor.
2. Open `supabase/scripts/seed_screenshot_demo_data.sql`.
3. Confirm the script target email is `kangym071900@gmail.com`.
4. Run the whole script.
5. Open the iOS app with that demo account and wait for sync.

The script deletes and reseeds only app data for the matched account. It does
not delete the auth user.

Seed contents:

- Today's calendar has visible task bars and a selected-day list.
- Tasks cover time, category, priority, tags, completed/incomplete states.
- Habits cover daily and weekly recurrence, reminders, and recent completion logs.
- Goals cover monthly/yearly, locked/unlocked, notes, targets, and Pro report access.
- Goal prompts are dismissed so screenshots are not interrupted by onboarding.
- Subscription is set to `pro` / `active` so full report screens are available.

## Screenshot Cut List

Capture on iPhone 6.9" first.

1. Home calendar with today's panel.
2. Add Task / Habit editor, preferably Habit tab showing recurrence/reminder.
3. Settings -> Goal screen with progress rings.
4. Full report screen.
5. Home-screen widget.

For the final App Store upload, keep the status bar clean and avoid personal
notifications, real emails, or private calendar content.
