const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function getFullProjects() {
  const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
  const procStmt = db.prepare("SELECT * FROM procurement_items WHERE project_id = ?");
  const milestoneStmt = db.prepare("SELECT * FROM installation_milestones WHERE project_id = ?");
  const maintStmt = db.prepare("SELECT * FROM maintenance_tasks WHERE project_id = ?");

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    location: p.location,
    capacityKw: p.capacity_kw,
    phase: p.phase,
    ptoDate: p.pto_date,
    procurement: procStmt.all(p.id).map((i) => ({ id: i.id, name: i.name, status: i.status, eta: i.eta })),
    installation: milestoneStmt.all(p.id).map((m) => ({ id: m.id, name: m.name, done: !!m.done, date: m.date })),
    maintenance: maintStmt.all(p.id).map((m) => ({ id: m.id, task: m.task, dueDate: m.due_date, status: m.status, notes: m.notes })),
  }));
}

// Seed the database on first run only
const { c: projectCount } = db.prepare("SELECT COUNT(*) as c FROM projects").get();
if (projectCount === 0) {
  require("./seed")(db);
  console.log("Seeded database with sample projects.");
}

// ---- Projects ----
app.get("/api/projects", (req, res) => {
  res.json(getFullProjects());
});

app.post("/api/projects", (req, res) => {
  const { name, location, capacityKw, phase, ptoDate } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO projects (id, name, location, capacity_kw, phase, pto_date) VALUES (?,?,?,?,?,?)"
  ).run(id, name.trim(), location || "", capacityKw || 0, phase || "Planning", ptoDate || null);
  res.json(getFullProjects().find((p) => p.id === id));
});

app.put("/api/projects/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "not found" });
  const { name, location, capacityKw, phase, ptoDate } = req.body;
  db.prepare(
    "UPDATE projects SET name=?, location=?, capacity_kw=?, phase=?, pto_date=? WHERE id=?"
  ).run(
    name ?? existing.name,
    location ?? existing.location,
    capacityKw ?? existing.capacity_kw,
    phase ?? existing.phase,
    ptoDate ?? existing.pto_date,
    req.params.id
  );
  res.json({ ok: true });
});

app.delete("/api/projects/:id", (req, res) => {
  db.prepare("DELETE FROM projects WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ---- Procurement ----
app.post("/api/projects/:id/procurement", (req, res) => {
  const { name, status, eta } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO procurement_items (id, project_id, name, status, eta) VALUES (?,?,?,?,?)"
  ).run(id, req.params.id, name.trim(), status || "Ordered", eta || null);
  res.json({ id });
});

app.patch("/api/procurement/:id", (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE procurement_items SET status=? WHERE id=?").run(status, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/procurement/:id", (req, res) => {
  db.prepare("DELETE FROM procurement_items WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ---- Installation milestones ----
app.post("/api/projects/:id/milestones", (req, res) => {
  const { name, date } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO installation_milestones (id, project_id, name, done, date) VALUES (?,?,?,0,?)"
  ).run(id, req.params.id, name.trim(), date || null);
  res.json({ id });
});

app.patch("/api/milestones/:id", (req, res) => {
  const { done } = req.body;
  db.prepare("UPDATE installation_milestones SET done=? WHERE id=?").run(done ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/milestones/:id", (req, res) => {
  db.prepare("DELETE FROM installation_milestones WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ---- Maintenance tasks ----
app.post("/api/projects/:id/maintenance", (req, res) => {
  const { task, dueDate } = req.body;
  if (!task || !task.trim()) return res.status(400).json({ error: "task is required" });
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO maintenance_tasks (id, project_id, task, due_date, status) VALUES (?,?,?,?,?)"
  ).run(id, req.params.id, task.trim(), dueDate || null, "Scheduled");
  res.json({ id });
});

app.patch("/api/maintenance/:id", (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE maintenance_tasks SET status=? WHERE id=?").run(status, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/maintenance/:id", (req, res) => {
  db.prepare("DELETE FROM maintenance_tasks WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Solar Portfolio Tracker running at http://localhost:${PORT}`);
  console.log(`Database file: ${path.join(__dirname, "solar_portfolio.db")}`);
});
