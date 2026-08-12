# Solar Portfolio Tracker

A dashboard for tracking solar project procurement, installation progress,
maintenance scheduling, and warehouse inventory — across two tabs:

- **Projects** — portfolio of sites, each with procurement items, installation
  milestones, and scheduled maintenance
- **Inventory** — stock levels by SKU, supplier, low-stock alerts, editable
  reorder thresholds and unit cost, stock value in ₱, and a one-click CSV
  backup download

Runs entirely in the browser. No backend, no database to set up — data is
saved to your browser's local storage automatically as you use it.

## Run it locally

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**).

## Deploy to Vercel

This is a static site (no backend, no environment variables needed) — Vercel
just needs to build it and serve the output.

1. Push this folder to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Solar portfolio tracker"
   gh repo create solar-portfolio-tracker --source=. --public --push
   # or create the repo on github.com and:
   # git remote add origin <your-repo-url>
   # git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel will detect it as a Vite project automatically (build command
   `npm run build`, output directory `dist`) — this is also pinned in
   `vercel.json`, so there's nothing to configure manually.
4. Click **Deploy**. Your app will be live at `your-project.vercel.app`.

Every push to your main branch redeploys automatically after that.

## Your data

Everything is stored in your browser's local storage, scoped to whichever
domain you're viewing the app on. That means:

- Data doesn't sync between browsers or devices
- Clearing your browser's site data will erase it
- Each visitor to your deployed site has their own separate local data —
  this is a personal single-user tool, not a shared team dashboard

If you outgrow this and want shared, persistent, multi-user data, a
database-backed version (deployable on Vercel with a real backend) is a
natural next step.

## Backing up inventory

The Inventory tab has a **Backup CSV** button that downloads the full
inventory list (name, category, SKU, quantity, supplier, reorder level, unit
cost, and stock value in ₱) as a timestamped `.csv` file — useful as a manual
backup on top of local storage, or for opening in Excel/Sheets.

## What's inside

- `src/App.jsx` — the entire app: both tabs, all components, local storage
  persistence
- `src/main.jsx` — React entry point
- `index.html`, `vite.config.js` — standard Vite scaffold
