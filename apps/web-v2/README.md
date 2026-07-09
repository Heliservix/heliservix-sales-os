# HeliServiX OS — web-v2

The database-backed rebuild of HeliServiX OS. See
`docs/HSV-REBUILD-001_DATABASE_MIGRATION.md` (repo root) for why this
exists and `infra/database/schema.sql` for the database it talks to.

Unlike `apps/web` (the original HSV OS 0.2/0.3), this app has no
localStorage persistence. All data lives in Postgres (Supabase) and is
shared across anyone who opens the app — a real step toward a
Maintenance Chief Portal that shows the same fleet as yours.

## Current scope

Only **Dashboard** and **Fleet (Helicopters)** are wired to the
database — list, create, view, edit, delete. Everything else in the
sidebar is marked "planned" and will be ported module by module, the
same way Helicopters was, once this slice is confirmed working.

## Local development

```bash
cd apps/web-v2
cp .env.example .env.local   # already done if you're reading this from the repo Claude set up
npm install
npm run dev
```

Open `http://localhost:3000`.

Before running the app, the database schema needs to exist. In the
Supabase dashboard: SQL Editor → New query → paste the contents of
`infra/database/schema.sql` → Run.
