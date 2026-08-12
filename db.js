const path = require("path");

let DatabaseSync;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch (e) {
  console.error(
    "\nThis app needs Node's built-in SQLite support (node:sqlite), which requires Node 22.5 or newer.\n" +
    "You're running " + process.version + ". Please install a newer Node.js from https://nodejs.org and try again.\n"
  );
  process.exit(1);
}

const db = new DatabaseSync(path.join(__dirname, "solar_portfolio.db"));

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  capacity_kw INTEGER DEFAULT 0,
  phase TEXT DEFAULT 'Planning',
  pto_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS procurement_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'Ordered',
  eta TEXT
);

CREATE TABLE IF NOT EXISTS installation_milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  done INTEGER DEFAULT 0,
  date TEXT
);

CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT 'Scheduled',
  notes TEXT
);
`);

module.exports = db;
