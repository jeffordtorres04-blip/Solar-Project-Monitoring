const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const { run, get, all, ensureReady } = require("./db");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(async (req, res, next) => {
  try {
    await ensureReady();
    next();
  } catch (e) {
    console.error("DB init failed:", e);
    res.status(500).json({ error: "Database not reachable. Check TURSO_DATABASE_URL / TURSO_AUTH_TOKEN." });
  }
});

async function getFullProjects() {
  const projects = await all("SELECT * FROM projects ORDER BY created_at DESC");
  const out = [];
  for (const p of projects) {
    const [procurement, installation, maintenance] = await Promise.all([
      all("SELECT * FROM procurement_items WHERE project_id = ?", [p.id]),
      all("SELECT * FROM installation_milestones WHERE project_id = ?", [p.id]),
      all("SELECT * FROM maintenance_tasks WHERE project_id = ?", [p.id]),
    ]);
    out.push({
      id: p.id,
      name: p.name,
      location: p.location,
      capacityKw: p.capacity_kw,
      phase: p.phase,
      ptoDate: p.pto_date,
      contactPhone: p.contact_phone,
      contactEmail: p.contact_email,
      procurement: procurement.map((i) => ({ id: i.id, name: i.name, status: i.status, eta: i.eta })),
      installation: installation.map((m) => ({ id: m.id, name: m.name, done: !!m.done, date: m.date })),
      maintenance: maintenance.map((m) => ({ id: m.id, task: m.task, dueDate: m.due_date, status: m.status, notes: m.notes })),
    });
  }
  return out;
}

// ---- Projects ----
app.get("/api/projects", async (req, res) => {
  try {
    res.json(await getFullProjects());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "query failed" });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const { name, location, capacityKw, phase, ptoDate, contactPhone, contactEmail } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
    const id = crypto.randomUUID();
    await run(
      "INSERT INTO projects (id, name, location, capacity_kw, phase, pto_date, contact_phone, contact_email) VALUES (?,?,?,?,?,?,?,?)",
      [id, name.trim(), location || "", capacityKw || 0, phase || "Planning", ptoDate || null, contactPhone || null, contactEmail || null]
    );
    const created = (await getFullProjects()).find((p) => p.id === id);
    res.json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "insert failed" });
  }
});

app.put("/api/projects/:id", async (req, res) => {
  try {
    const existing = await get("SELECT * FROM projects WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: "not found" });
    const { name, location, capacityKw, phase, ptoDate, contactPhone, contactEmail } = req.body;
    await run(
      "UPDATE projects SET name=?, location=?, capacity_kw=?, phase=?, pto_date=?, contact_phone=?, contact_email=? WHERE id=?",
      [
        name ?? existing.name,
        location ?? existing.location,
        capacityKw ?? existing.capacity_kw,
        phase ?? existing.phase,
        ptoDate ?? existing.pto_date,
        contactPhone ?? existing.contact_phone,
        contactEmail ?? existing.contact_email,
        req.params.id,
      ]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "update failed" });
  }
});

app.delete("/api/projects/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await run("DELETE FROM procurement_items WHERE project_id=?", [id]);
    await run("DELETE FROM installation_milestones WHERE project_id=?", [id]);
    await run("DELETE FROM maintenance_tasks WHERE project_id=?", [id]);
    await run("DELETE FROM projects WHERE id=?", [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "delete failed" });
  }
});

// ---- Procurement ----
app.post("/api/projects/:id/procurement", async (req, res) => {
  try {
    const { name, status, eta } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
    const id = crypto.randomUUID();
    await run(
      "INSERT INTO procurement_items (id, project_id, name, status, eta) VALUES (?,?,?,?,?)",
      [id, req.params.id, name.trim(), status || "Ordered", eta || null]
    );
    res.json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "insert failed" });
  }
});

app.patch("/api/procurement/:id", async (req, res) => {
  try {
    await run("UPDATE procurement_items SET status=? WHERE id=?", [req.body.status, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "update failed" });
  }
});

app.delete("/api/procurement/:id", async (req, res) => {
  try {
    await run("DELETE FROM procurement_items WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "delete failed" });
  }
});

// ---- Installation milestones ----
app.post("/api/projects/:id/milestones", async (req, res) => {
  try {
    const { name, date } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
    const id = crypto.randomUUID();
    await run(
      "INSERT INTO installation_milestones (id, project_id, name, done, date) VALUES (?,?,?,0,?)",
      [id, req.params.id, name.trim(), date || null]
    );
    res.json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "insert failed" });
  }
});

app.patch("/api/milestones/:id", async (req, res) => {
  try {
    await run("UPDATE installation_milestones SET done=? WHERE id=?", [req.body.done ? 1 : 0, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "update failed" });
  }
});

app.delete("/api/milestones/:id", async (req, res) => {
  try {
    await run("DELETE FROM installation_milestones WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "delete failed" });
  }
});

// ---- Maintenance tasks ----
app.post("/api/projects/:id/maintenance", async (req, res) => {
  try {
    const { task, dueDate } = req.body;
    if (!task || !task.trim()) return res.status(400).json({ error: "task is required" });
    const id = crypto.randomUUID();
    await run(
      "INSERT INTO maintenance_tasks (id, project_id, task, due_date, status) VALUES (?,?,?,?,?)",
      [id, req.params.id, task.trim(), dueDate || null, "Scheduled"]
    );
    res.json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "insert failed" });
  }
});

app.patch("/api/maintenance/:id", async (req, res) => {
  try {
    await run("UPDATE maintenance_tasks SET status=? WHERE id=?", [req.body.status, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "update failed" });
  }
});

app.delete("/api/maintenance/:id", async (req, res) => {
  try {
    await run("DELETE FROM maintenance_tasks WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "delete failed" });
  }
});

// ---- Inventory ----
function mapInventoryRow(i) {
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    sku: i.sku,
    quantity: i.quantity,
    unit: i.unit,
    reorderLevel: i.reorder_level,
    supplier: i.supplier,
    unitCost: i.unit_cost,
  };
}

app.get("/api/inventory", async (req, res) => {
  try {
    const rows = await all("SELECT * FROM inventory_items ORDER BY created_at DESC");
    res.json(rows.map(mapInventoryRow));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "query failed" });
  }
});

app.post("/api/inventory", async (req, res) => {
  try {
    const { name, category, sku, quantity, unit, reorderLevel, supplier, unitCost } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
    const id = crypto.randomUUID();
    await run(
      "INSERT INTO inventory_items (id, name, category, sku, quantity, unit, reorder_level, supplier, unit_cost) VALUES (?,?,?,?,?,?,?,?,?)",
      [id, name.trim(), category || "Other", (sku || "").trim(), Number(quantity) || 0, unit || "pcs", Number(reorderLevel) || 0, (supplier || "").trim(), Number(unitCost) || 0]
    );
    const created = await get("SELECT * FROM inventory_items WHERE id = ?", [id]);
    res.json(mapInventoryRow(created));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "insert failed" });
  }
});

app.patch("/api/inventory/:id", async (req, res) => {
  try {
    const existing = await get("SELECT * FROM inventory_items WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: "not found" });
    const { quantity, supplier, reorderLevel, unitCost } = req.body;
    await run(
      "UPDATE inventory_items SET quantity=?, supplier=?, reorder_level=?, unit_cost=? WHERE id=?",
      [
        quantity ?? existing.quantity,
        supplier ?? existing.supplier,
        reorderLevel ?? existing.reorder_level,
        unitCost ?? existing.unit_cost,
        req.params.id,
      ]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "update failed" });
  }
});

app.delete("/api/inventory/:id", async (req, res) => {
  try {
    await run("DELETE FROM inventory_items WHERE id=?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "delete failed" });
  }
});

module.exports = app;
