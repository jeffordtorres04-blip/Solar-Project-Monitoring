# Solar Portfolio Tracker

A web app for tracking solar project procurement, installation progress, and
maintenance scheduling across a portfolio of sites. Runs as an Express app,
deployable on [Vercel](https://vercel.com), backed by a [Turso](https://turso.tech)
database (SQLite-compatible, free tier available).

## Why Turso instead of a local SQLite file

Vercel's serverless functions don't have a persistent disk — anything written
to a local file disappears between requests. Turso is SQLite, but hosted, so
your data survives across deployments and function invocations. The queries
and schema are the same SQL you'd use with local SQLite.

## 1. Create a Turso database

```bash
# install the CLI (see https://docs.turso.tech/cli/installation for other OSes)
curl -sSfL https://get.tur.so/install.sh | bash

turso auth signup        # or: turso auth login
turso db create solar-portfolio
turso db show solar-portfolio --url        # -> TURSO_DATABASE_URL
turso db tokens create solar-portfolio     # -> TURSO_AUTH_TOKEN
```

Prefer a GUI? Turso also has a web dashboard at [turso.tech](https://turso.tech)
where you can create a database and copy the URL/token without the CLI.

## 2. Run it locally

```bash
npm install
cp .env.example .env
# paste your TURSO_DATABASE_URL and TURSO_AUTH_TOKEN into .env
npm start
```

Open **http://localhost:3000**. First run creates the tables and seeds three
sample projects automatically. If you skip the `.env` setup, it falls back to
a local `local-dev.db` file so you can still try it out — just note that mode
won't work once deployed to Vercel.

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Solar portfolio tracker"
gh repo create solar-portfolio-tracker --source=. --public --push
# or create the repo on github.com and:
# git remote add origin <your-repo-url>
# git push -u origin main
```

## 4. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo.
2. Vercel will detect it as a Node.js project — no build settings to change.
3. Before deploying, add environment variables (Project Settings → Environment
   Variables, or during the import flow):
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
4. Deploy. Your app will be live at `your-project.vercel.app`.

Every push to your main branch redeploys automatically.

## What's inside

- `app.js` — the Express app: all `/api/*` routes, shared by both entry points
- `api/index.js` — Vercel serverless entry point (just re-exports `app.js`)
- `server.js` — local dev entry point (`app.listen(...)`)
- `db.js` — Turso/libSQL connection, schema creation, and query helpers
- `seed.js` — sample data loaded once, only if the database is empty
- `vercel.json` — routes all `/api/*` requests to the single serverless function
- `public/` — the frontend (React via CDN, no build step needed)

## Your data

Everything lives in your Turso database, not in this repo. Useful commands:

```bash
turso db shell solar-portfolio          # open a SQL shell
turso db shell solar-portfolio "DELETE FROM projects"   # wipe and reseed on next request
```
