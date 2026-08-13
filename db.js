const { createClient } = require("@libsql/client");

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.warn(
    "\nTURSO_DATABASE_URL is not set. Create a free database at https://turso.tech " +
    "and set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN as environment variables " +
    "(see .env.example). Falling back to a local file database for now.\n"
  );
}

const client = createClient({
  url: url || "file:local-dev.db",
  authToken,
});

async function run(sql, args = []) {
  return client.execute({ sql, args });
}
async function get(sql, args = []) {
  const r = await client.execute({ sql, args });
  return r.rows[0] || null;
}
async function all(sql, args = []) {
  const r = await client.execute({ sql, args });
  return r.rows;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    capacity_kw INTEGER DEFAULT 0,
    phase TEXT DEFAULT 'Planning',
    pto_date TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS procurement_items (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Ordered',
    eta TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS installation_milestones (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    date TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task TEXT NOT NULL,
    due_date TEXT,
    status TEXT DEFAULT 'Scheduled',
    notes TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Other',
    sku TEXT,
    quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    reorder_level INTEGER DEFAULT 0,
    supplier TEXT,
    unit_cost REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
];

// Columns added after the initial release — applied with try/catch so
// existing databases created before this change pick them up too.
const MIGRATIONS = [
  `ALTER TABLE projects ADD COLUMN contact_phone TEXT`,
  `ALTER TABLE projects ADD COLUMN contact_email TEXT`,
];

// Memoized so schema setup + seed check only run once per warm server/lambda instance.
let initPromise = null;
function ensureReady() {
  if (!initPromise) {
    initPromise = (async () => {
      for (const stmt of SCHEMA) await client.execute(stmt);
      for (const stmt of MIGRATIONS) {
        try { await client.execute(stmt); } catch (e) { /* column already exists */ }
      }
      const row = await get("SELECT COUNT(*) as c FROM projects");
      if (Number(row.c) === 0) {
        await require("./seed")({ run });
        console.log("Seeded database with sample projects.");
      }
      const invRow = await get("SELECT COUNT(*) as c FROM inventory_items");
      if (Number(invRow.c) === 0) {
        await require("./seed-inventory")({ run });
        console.log("Seeded database with sample inventory.");
      }
    })().catch((err) => {
      initPromise = null; // allow retry on next request instead of staying broken forever
      throw err;
    });
  }
  return initPromise;
}

module.exports = { run, get, all, ensureReady };
