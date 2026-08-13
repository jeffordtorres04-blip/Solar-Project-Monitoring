const crypto = require("crypto");

module.exports = async function seed({ run }) {
  const projects = [
    {
      name: "Kapalong Ridge Solar",
      location: "Kapalong, Davao del Norte",
      capacityKw: 2400,
      phase: "Installation",
      ptoDate: "2026-11-15",
      contactPhone: "+63 917 234 5678",
      contactEmail: "site.manager@kapalongridge.ph",
      procurement: [
        { name: "PV Modules (540W, x4200)", status: "Delivered", eta: "2026-07-02" },
        { name: "String Inverters (x18)", status: "Delivered", eta: "2026-07-10" },
        { name: "Racking & Mounting", status: "Shipped", eta: "2026-08-18" },
        { name: "MV Transformer", status: "Ordered", eta: "2026-09-05" },
      ],
      installation: [
        { name: "Site prep & grading", done: 1, date: "2026-06-20" },
        { name: "Racking installed", done: 1, date: "2026-07-25" },
        { name: "Module installation", done: 0, date: "2026-08-30" },
        { name: "DC wiring & combiners", done: 0, date: "2026-09-10" },
        { name: "Inverter commissioning", done: 0, date: "2026-09-25" },
        { name: "AC interconnection", done: 0, date: "2026-10-15" },
      ],
      maintenance: [
        { task: "Vegetation control — perimeter", dueDate: "2026-08-20", status: "Scheduled", notes: "" },
        { task: "Torque check — racking bolts", dueDate: "2026-08-05", status: "Scheduled", notes: "Pre-module install QA" },
      ],
    },
    {
      name: "Toril C&I Rooftop",
      location: "Toril, Davao City",
      capacityKw: 480,
      phase: "Operational",
      ptoDate: "2026-04-01",
      contactPhone: "+63 918 345 6789",
      contactEmail: "facilities@torilrooftop.ph",
      procurement: [
        { name: "PV Modules (450W, x1070)", status: "Delivered", eta: "2026-02-14" },
        { name: "Hybrid Inverters (x4)", status: "Delivered", eta: "2026-02-20" },
      ],
      installation: [
        { name: "Structural assessment", done: 1, date: "2026-01-15" },
        { name: "Racking installed", done: 1, date: "2026-02-10" },
        { name: "Module installation", done: 1, date: "2026-03-05" },
        { name: "Inverter commissioning", done: 1, date: "2026-03-20" },
        { name: "AC interconnection", done: 1, date: "2026-03-28" },
      ],
      maintenance: [
        { task: "Panel cleaning (dry season)", dueDate: "2026-08-14", status: "Scheduled", notes: "" },
        { task: "Inverter firmware check", dueDate: "2026-07-30", status: "Overdue", notes: "Vendor bulletin issued" },
        { task: "Quarterly performance audit", dueDate: "2026-06-30", status: "Done", notes: "PR 84.2%" },
      ],
    },
    {
      name: "Panabo Agri-Solar",
      location: "Panabo, Davao del Norte",
      capacityKw: 1200,
      phase: "Procurement",
      ptoDate: "2027-02-01",
      contactPhone: "+63 919 456 7890",
      contactEmail: "coop.admin@panaboagrisolar.ph",
      procurement: [
        { name: "PV Modules (550W, x2180)", status: "Ordered", eta: "2026-09-12" },
        { name: "Central Inverter", status: "Ordered", eta: "2026-09-20" },
        { name: "Racking & Mounting", status: "Ordered", eta: "2026-10-01" },
      ],
      installation: [
        { name: "Site prep & grading", done: 0, date: "2026-09-15" },
        { name: "Racking installed", done: 0, date: "2026-10-10" },
        { name: "Module installation", done: 0, date: "2026-11-01" },
      ],
      maintenance: [],
    },
  ];

  for (const p of projects) {
    const projectId = crypto.randomUUID();
    await run(
      "INSERT INTO projects (id, name, location, capacity_kw, phase, pto_date, contact_phone, contact_email) VALUES (?,?,?,?,?,?,?,?)",
      [projectId, p.name, p.location, p.capacityKw, p.phase, p.ptoDate, p.contactPhone || null, p.contactEmail || null]
    );
    for (const item of p.procurement) {
      await run(
        "INSERT INTO procurement_items (id, project_id, name, status, eta) VALUES (?,?,?,?,?)",
        [crypto.randomUUID(), projectId, item.name, item.status, item.eta]
      );
    }
    for (const m of p.installation) {
      await run(
        "INSERT INTO installation_milestones (id, project_id, name, done, date) VALUES (?,?,?,?,?)",
        [crypto.randomUUID(), projectId, m.name, m.done, m.date]
      );
    }
    for (const m of p.maintenance) {
      await run(
        "INSERT INTO maintenance_tasks (id, project_id, task, due_date, status, notes) VALUES (?,?,?,?,?,?)",
        [crypto.randomUUID(), projectId, m.task, m.dueDate, m.status, m.notes || ""]
      );
    }
  }
};
