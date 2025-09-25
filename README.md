## 🛠 Supabase Local Development & Migrations (for Team Collaboration)

This guide outlines everything a developer needs to set up, run, and collaborate on the Supabase local development environment using the CLI and Docker.

---

### ✅ Prerequisites

- Node.js ≥ 18
- `pnpm`, `yarn`, or `npm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Supabase CLI installed:

```
bunx supabase@latest init
```

---

### 🧱 Initial Project Setup (First-Time Only)

> Skip this if the project is already initialized.

1. **Initialize Supabase project**:

```
supabase init
```

2. **Folder structure created**:
   supabase/
   ├── config.toml
   ├── migrations/
   ├── seed.sql

---

### 🧪 Running Supabase Locally

> Every dev will run a local Postgres, Studio, etc. using Docker containers.

1. **Start Supabase locally**:

```
supabase start
```

This spins up:

- Postgres database
- Supabase Studio (localhost:54323)
- APIs, Realtime, Auth
- Container -> docker rm -f supabase_vector_smuves-app

2. **Access local Supabase Studio**:  
   [http://localhost:54323/project/default/editor](http://localhost:54323/project/default/editor)

---

### 📦 Local Development Workflow (per Developer)

1. **Pull latest code**:

```
git pull origin main (or develop)
```

2. **Reset & reapply all migrations**:

```
supabase db reset
```

> ⚠️ This will **delete** and **recreate** your local DB — only do this locally!

3. **Optional: Seed database (Currently Not Available)**  
   Add test data to `supabase/seed.sql`.  
   This runs automatically after `db reset`.

---

### 📤 Creating Migrations (when schema is changed)

1. **Make your schema changes** (create/alter/drop tables, etc.) using Studio or SQL files.
   Studio is local instance of Supabase DB dockerized generated with _supabase start_. **_We'll keep working on this instance in the local development_**.
   To use it, update env variables to (you can go to the local Supabase Studio at http://localhost:54323 → Settings → API to find them.): - NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 - NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key - SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key

2. **Create a migration file**:

```
supabase db diff --use-migra -f supabase/migrations/<meaningful-name>.sql
```

Example:

```
supabase db diff --use-migra -f supabase/migrations/20250807_add_events_table.sql
```

3. **Test it locally**:

```
supabase db reset
```

4. **Commit & push**:

```
git add supabase/migrations
git commit -m "Add events table migration"
git push origin <branch-name>
```

---

### 👯 For Other Developers (When Pulling New Migrations)

1. Pull latest code:

```
git pull
```

2. Reapply all migrations:

```
supabase db reset
```

---

### 🚀 Deploying to Remote Supabase Project (e.g., Staging/Prod)

1. Make sure you're logged in:

```
supabase login
```

2. Link to the correct remote project:

```
supabase link --project-ref <project-id>
```

3. Push all migrations to remote DB:

```
supabase db push
```

> ✅ This will **preserve all data** and apply new migrations only.

---

### 🛠 Migration Troubleshooting (Advanced)

#### ❓Remote out of sync?

You may see:
** Remote migration versions not found in local migrations directory. **

Fix with:

```
supabase migration repair --status=applied <migration_id>
```

> ⚠️ Avoid this unless absolutely necessary. Only used when history is broken.

---

### 📋 Helpful Commands Reference

| Task                            | Command                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| Start local Supabase            | `supabase start`                                                 |
| Stop local Supabase             | `supabase stop`                                                  |
| View Studio                     | [http://localhost:54323](http://localhost:54323)                 |
| Create migration file           | `supabase db diff --use-migra -f supabase/migrations/<name>.sql` |
| Apply all migrations (reset DB) | `supabase db reset`                                              |
| Push migrations to remote       | `supabase db push`                                               |
| Link project to remote Supabase | `supabase link --project-ref <project-id>`                       |
| Repair remote migration state   | `supabase migration repair --status=applied <migration_id>`      |
| List migrations                 | `supabase migration list`                                        |

---

### 🙋 FAQ

#### ❓ Does `supabase db reset` delete data?

Yes, it **drops the entire local database**. Use only in **local dev**, never in production.

#### ❓ Will `supabase db push` delete data?

No. It safely applies migrations to your remote Supabase database. Use this in staging/prod.

##### Need More ? You can check out this chat:

###### https://chatgpt.com/share/6894aede-c10c-8011-b148-5404cfa82aed
