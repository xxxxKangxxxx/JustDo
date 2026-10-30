# External integrations

Other services can put tasks into a Just Do account through one server API.
The first client is get_a_job (job application schedule), which sends each
posting's application period (서류 접수 기간) as a date-range task.

## How it works

- `PUT /api/integrations/tasks` with `Authorization: Bearer jd_int_...`.
- The token belongs to one user and one `source` (e.g. `get_a_job`).
- The body is the **full set** of tasks that source wants the user to have:

```json
{
  "category": "취업",
  "items": [
    {
      "externalId": "period:123",
      "title": "동국제약 구매팀 서류 접수 (~18:00)",
      "memo": "구매 · https://...",
      "startDate": "2026-10-20",
      "endDate": "2026-11-02",
      "completed": false
    }
  ]
}
```

- New `externalId` → task created (in `category`, created if missing).
- Known `externalId` → title, memo and dates updated when changed. `completed: true`
  marks the task done; the source never reopens a task the user completed.
- A task the source stops sending is deleted, unless it is completed or its
  `end_date` is before today (KST). Those stay as history.
- Tasks the user created themselves (`external_source is null`) are never touched.
- Response: `{ ok, created, updated, deleted, unchanged }`. Errors: `401 invalid_token`,
  `400 <reason>`, `500 sync_failed`. Max 500 items.

Edits the user makes in Just Do to title or dates of a synced task are
overwritten on the next sync; deleting a synced task brings it back on the
next sync while the source still sends it.

## Schema

Migration `20261030090000_integration_tokens.sql`:

- `integration_tokens` (user_id, source, token_hash, label, last_used_at, revoked_at).
  RLS on with no policies: only the service-role key reaches it.
- `tasks.external_source`, `tasks.external_id` + unique index per user.

## Tokens

Users create and revoke tokens themselves on the web: **설정 → 외부 연동**.
The page calls `/api/integrations/tokens` with the user's Supabase access token
(`GET` list, `POST { source, label }` create — token shown once, `DELETE ?id=` revoke).
Max 10 active tokens per user. Revoking keeps the tasks already imported.

Admin fallback, from `apps/web` with the hosted credentials in `.env.local`:

```bash
node --env-file=.env.local scripts/issue-integration-token.mjs --email you@example.com --source get_a_job --label "취업 일정"
node --env-file=.env.local scripts/issue-integration-token.mjs --revoke <token-row-id>
```

The token is printed once. Put it in the calling service's secret store.
