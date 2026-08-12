# Solar Portfolio Tracker

A local web app for tracking solar project procurement, installation progress,
and maintenance scheduling across a portfolio of sites — backed by a real
SQLite database on your machine.

## Setup

Requires [Node.js](https://nodejs.org) 16 or newer.

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

On first run, the database is created automatically at `solar_portfolio.db`
in this folder and seeded with three sample projects so you can see it working
right away. Delete them from the UI whenever you're ready to add your own.

## What's inside

- `server.js` — Express server exposing a REST API over the database
- `db.js` — SQLite schema (`projects`, `procurement_items`,
  `installation_milestones`, `maintenance_tasks`)
- `seed.js` — sample data loaded once, only if the database is empty
- `public/` — the frontend (React via CDN, no build step needed)

## Your data

Everything lives in `solar_portfolio.db`, a single SQLite file in this folder.

- **Back it up**: just copy that file somewhere safe.
- **Reset everything**: stop the server, delete `solar_portfolio.db`, restart —
  it'll be recreated and reseeded.
- **Inspect it directly**: any SQLite client works, e.g.
  `sqlite3 solar_portfolio.db` or the [DB Browser for SQLite](https://sqlitebrowser.org/) app.

## Notes

- The frontend loads React and fonts from a CDN, so an internet connection
  is needed the first time a page loads (the server and database themselves
  are fully local and work offline).
- Change the port with `PORT=4000 npm start` if 3000 is taken.
