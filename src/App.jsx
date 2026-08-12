import React, { useState, useEffect, useMemo } from "react";
import {
  Sun, Package, HardHat, CalendarClock, ChevronDown, Plus, X,
  CheckCircle2, AlertTriangle, Clock, MapPin, Zap, Trash2, Search,
  Truck, ClipboardCheck, Loader2, Boxes, Minus, Settings, DollarSign, Download
} from "lucide-react";

const PHASES = ["Planning", "Procurement", "Installation", "Commissioning", "Operational"];
const PHASE_SHORT = { Planning: "PLAN", Procurement: "PROC", Installation: "INST", Commissioning: "COMM", Operational: "OPS" };

const INVENTORY_CATEGORIES = ["Modules", "Inverters", "Racking", "Cabling", "Electrical", "Tools", "Other"];
const UNITS = ["pcs", "units", "m", "rolls", "boxes", "sets"];

const T = {
  bg: "#0C1626",
  panel: "#12213A",
  panelAlt: "#0F1C30",
  border: "#22354F",
  borderLight: "#2C4364",
  text: "#E7EDF5",
  textDim: "#8FA1B8",
  textFaint: "#5C7089",
  amber: "#F5A623",
  amberDim: "#8A6321",
  green: "#4ADE80",
  greenDim: "#1F4A34",
  red: "#F87171",
  redDim: "#4A2323",
  blue: "#60A5FA",
  blueDim: "#1F3352",
};

const display = { fontFamily: "'Space Grotesk', sans-serif" };
const mono = { fontFamily: "'IBM Plex Mono', monospace" };

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const daysUntil = (d) => {
  const dt = new Date(d + "T00:00:00");
  const now = new Date(todayISO() + "T00:00:00");
  return Math.round((dt - now) / 86400000);
};

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadInventoryCsv(inventory) {
  const headers = ["Name", "Category", "SKU", "Quantity", "Unit", "Reorder At", "Supplier", "Unit Cost (PHP)", "Stock Value (PHP)"];
  const rows = inventory.map((i) => [
    i.name, i.category, i.sku || "", i.quantity, i.unit,
    i.reorderLevel, i.supplier || "", i.unitCost || 0,
    Math.round((i.quantity || 0) * (i.unitCost || 0)),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `solar-inventory-backup-${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function seedProjects() {
  return [
    {
      id: uid(),
      name: "Kapalong Ridge Solar",
      location: "Kapalong, Davao del Norte",
      capacityKw: 2400,
      phase: "Installation",
      ptoDate: "2026-11-15",
      procurement: [
        { id: uid(), name: "PV Modules (540W, x4200)", status: "Delivered", eta: "2026-07-02" },
        { id: uid(), name: "String Inverters (x18)", status: "Delivered", eta: "2026-07-10" },
        { id: uid(), name: "Racking & Mounting", status: "Shipped", eta: "2026-08-18" },
        { id: uid(), name: "MV Transformer", status: "Ordered", eta: "2026-09-05" },
      ],
      installation: [
        { id: uid(), name: "Site prep & grading", done: true, date: "2026-06-20" },
        { id: uid(), name: "Racking installed", done: true, date: "2026-07-25" },
        { id: uid(), name: "Module installation", done: false, date: "2026-08-30" },
        { id: uid(), name: "DC wiring & combiners", done: false, date: "2026-09-10" },
        { id: uid(), name: "Inverter commissioning", done: false, date: "2026-09-25" },
        { id: uid(), name: "AC interconnection", done: false, date: "2026-10-15" },
      ],
      maintenance: [
        { id: uid(), task: "Vegetation control — perimeter", dueDate: "2026-08-20", status: "Scheduled", notes: "" },
        { id: uid(), task: "Torque check — racking bolts", dueDate: "2026-08-05", status: "Scheduled", notes: "Pre-module install QA" },
      ],
    },
    {
      id: uid(),
      name: "Toril C&I Rooftop",
      location: "Toril, Davao City",
      capacityKw: 480,
      phase: "Operational",
      ptoDate: "2026-04-01",
      procurement: [
        { id: uid(), name: "PV Modules (450W, x1070)", status: "Delivered", eta: "2026-02-14" },
        { id: uid(), name: "Hybrid Inverters (x4)", status: "Delivered", eta: "2026-02-20" },
      ],
      installation: [
        { id: uid(), name: "Structural assessment", done: true, date: "2026-01-15" },
        { id: uid(), name: "Racking installed", done: true, date: "2026-02-10" },
        { id: uid(), name: "Module installation", done: true, date: "2026-03-05" },
        { id: uid(), name: "Inverter commissioning", done: true, date: "2026-03-20" },
        { id: uid(), name: "AC interconnection", done: true, date: "2026-03-28" },
      ],
      maintenance: [
        { id: uid(), task: "Panel cleaning (dry season)", dueDate: "2026-08-14", status: "Scheduled", notes: "" },
        { id: uid(), task: "Inverter firmware check", dueDate: "2026-07-30", status: "Overdue", notes: "Vendor bulletin issued" },
        { id: uid(), task: "Quarterly performance audit", dueDate: "2026-06-30", status: "Done", notes: "PR 84.2%" },
      ],
    },
    {
      id: uid(),
      name: "Panabo Agri-Solar",
      location: "Panabo, Davao del Norte",
      capacityKw: 1200,
      phase: "Procurement",
      ptoDate: "2027-02-01",
      procurement: [
        { id: uid(), name: "PV Modules (550W, x2180)", status: "Ordered", eta: "2026-09-12" },
        { id: uid(), name: "Central Inverter", status: "Ordered", eta: "2026-09-20" },
        { id: uid(), name: "Racking & Mounting", status: "Ordered", eta: "2026-10-01" },
      ],
      installation: [
        { id: uid(), name: "Site prep & grading", done: false, date: "2026-09-15" },
        { id: uid(), name: "Racking installed", done: false, date: "2026-10-10" },
        { id: uid(), name: "Module installation", done: false, date: "2026-11-01" },
      ],
      maintenance: [],
    },
  ];
}

function seedInventory() {
  return [
    { id: uid(), name: "540W Monocrystalline Module", category: "Modules", sku: "MOD-540-MC", quantity: 340, unit: "pcs", reorderLevel: 100, supplier: "SunTech Philippines", unitCost: 4600 },
    { id: uid(), name: "String Inverter 25kW", category: "Inverters", sku: "INV-STR-25K", quantity: 6, unit: "units", reorderLevel: 8, supplier: "Huawei FusionSolar", unitCost: 103600 },
    { id: uid(), name: "Ground Mount Racking Rail (4m)", category: "Racking", sku: "RCK-RAIL-4M", quantity: 210, unit: "pcs", reorderLevel: 150, supplier: "Davao Steel Works", unitCost: 1350 },
    { id: uid(), name: "DC Solar Cable 6mm² (100m roll)", category: "Cabling", sku: "CBL-DC-6MM", quantity: 4, unit: "rolls", reorderLevel: 5, supplier: "Phelps Dodge PH", unitCost: 8100 },
    { id: uid(), name: "MC4 Connector Pair", category: "Electrical", sku: "ELC-MC4-PR", quantity: 850, unit: "sets", reorderLevel: 200, supplier: "Staubli Electrical", unitCost: 67 },
    { id: uid(), name: "Torque Wrench Set", category: "Tools", sku: "TL-TRQ-SET", quantity: 3, unit: "sets", reorderLevel: 4, supplier: "Local Hardware Supply", unitCost: 11800 },
  ];
}

const phaseIndex = (p) => Math.max(0, PHASES.indexOf(p));

function PhaseRail({ phase }) {
  const idx = phaseIndex(phase);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 220 }}>
      {PHASES.map((p, i) => {
        const state = i < idx ? "done" : i === idx ? "current" : "future";
        return (
          <React.Fragment key={p}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 12, height: 12, borderRadius: 999,
                  background: state === "done" ? T.amberDim : state === "current" ? T.amber : "transparent",
                  border: `1.5px solid ${state === "future" ? T.borderLight : T.amber}`,
                  boxShadow: state === "current" ? `0 0 0 3px ${T.amber}33` : "none",
                  position: "relative", flexShrink: 0,
                }}
              >
                {state === "current" && <Sun size={8} style={{ position: "absolute", top: 1, left: 1, color: T.bg }} />}
              </div>
              <span style={{ ...mono, fontSize: 8, letterSpacing: "0.05em", color: state === "future" ? T.textFaint : T.textDim }}>
                {PHASE_SHORT[p]}
              </span>
            </div>
            {i < PHASES.length - 1 && (
              <div style={{ flex: 1, height: 1.5, background: i < idx ? T.amberDim : T.border, marginBottom: 14 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Badge({ children, tone = "neutral" }) {
  const map = {
    neutral: { bg: T.panelAlt, fg: T.textDim, bd: T.border },
    green: { bg: T.greenDim, fg: T.green, bd: T.green },
    red: { bg: T.redDim, fg: T.red, bd: T.red },
    amber: { bg: T.amberDim, fg: T.amber, bd: T.amber },
    blue: { bg: T.blueDim, fg: T.blue, bd: T.blue },
  };
  const c = map[tone];
  return (
    <span style={{
      ...mono, fontSize: 10.5, letterSpacing: "0.03em", padding: "2px 7px", borderRadius: 4,
      background: c.bg, color: c.fg, border: `1px solid ${c.bd}44`, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function procTone(status) {
  return status === "Delivered" ? "green" : status === "Shipped" ? "blue" : "neutral";
}
function maintTone(status) {
  return status === "Done" ? "green" : status === "Overdue" ? "red" : "amber";
}

function IconBtn({ onClick, children, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "transparent", border: "none", cursor: "pointer",
        color: danger ? T.red : T.textDim, padding: 4, borderRadius: 4,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? T.redDim : T.panelAlt)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

function SectionLabel({ icon, children, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: T.textDim, ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {icon}
        {children}
      </div>
      {action}
    </div>
  );
}

function TinyAddRow({ placeholder, onAdd, extraFields }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [extra, setExtra] = useState({});

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          ...mono, fontSize: 11, color: T.amber, background: "transparent", border: `1px dashed ${T.amberDim}`,
          borderRadius: 6, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, marginTop: 4,
        }}
      >
        <Plus size={12} /> {placeholder}
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 6, background: T.panelAlt, padding: 8, borderRadius: 6, border: `1px solid ${T.border}` }}>
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Name"
        style={{
          ...mono, fontSize: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4,
          padding: "6px 8px", color: T.text, flex: "1 1 160px", minWidth: 120,
        }}
      />
      {extraFields && extraFields.map((f) => (
        f.type === "date" ? (
          <input
            key={f.key}
            type="date"
            value={extra[f.key] || ""}
            onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })}
            style={{ ...mono, fontSize: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, padding: "6px 8px", color: T.text }}
          />
        ) : (
          <select
            key={f.key}
            value={extra[f.key] || f.options[0]}
            onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })}
            style={{ ...mono, fontSize: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, padding: "6px 8px", color: T.text }}
          >
            {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )
      ))}
      <button
        onClick={() => {
          if (!val.trim()) return;
          onAdd({ name: val.trim(), ...extra });
          setVal(""); setExtra({}); setOpen(false);
        }}
        style={{ ...mono, fontSize: 11, background: T.amber, color: T.bg, border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontWeight: 600 }}
      >
        Add
      </button>
      <button
        onClick={() => { setOpen(false); setVal(""); setExtra({}); }}
        style={{ ...mono, fontSize: 11, background: "transparent", color: T.textDim, border: `1px solid ${T.border}`, borderRadius: 4, padding: "6px 8px", cursor: "pointer" }}
      >
        Cancel
      </button>
    </div>
  );
}

function ProjectDetail({ project, update }) {
  const setProject = (patch) => update({ ...project, ...patch });

  const addProcurement = (item) => setProject({
    procurement: [...project.procurement, { id: uid(), name: item.name, status: item.status || "Ordered", eta: item.eta || "" }],
  });
  const cycleProcStatus = (id) => {
    const order = ["Ordered", "Shipped", "Delivered"];
    setProject({
      procurement: project.procurement.map((p) => p.id === id
        ? { ...p, status: order[(order.indexOf(p.status) + 1) % order.length] } : p),
    });
  };
  const removeProc = (id) => setProject({ procurement: project.procurement.filter((p) => p.id !== id) });

  const addMilestone = (item) => setProject({
    installation: [...project.installation, { id: uid(), name: item.name, done: false, date: item.date || "" }],
  });
  const toggleMilestone = (id) => setProject({
    installation: project.installation.map((m) => m.id === id ? { ...m, done: !m.done } : m),
  });
  const removeMilestone = (id) => setProject({ installation: project.installation.filter((m) => m.id !== id) });

  const addMaint = (item) => setProject({
    maintenance: [...project.maintenance, { id: uid(), task: item.name, dueDate: item.dueDate || todayISO(), status: "Scheduled", notes: "" }],
  });
  const cycleMaintStatus = (id) => {
    const order = ["Scheduled", "Done"];
    setProject({
      maintenance: project.maintenance.map((m) => m.id === id
        ? { ...m, status: m.status === "Overdue" ? "Done" : order[(order.indexOf(m.status) + 1) % order.length] } : m),
    });
  };
  const removeMaint = (id) => setProject({ maintenance: project.maintenance.filter((m) => m.id !== id) });

  const doneCount = project.installation.filter((m) => m.done).length;
  const pct = project.installation.length ? Math.round((doneCount / project.installation.length) * 100) : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, padding: "18px 20px", background: T.panelAlt, borderTop: `1px solid ${T.border}` }}>
      {/* Procurement */}
      <div>
        <SectionLabel icon={<Package size={13} />}>Procurement</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {project.procurement.length === 0 && <div style={{ ...mono, fontSize: 11, color: T.textFaint }}>No items yet.</div>}
          {project.procurement.map((item) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 9px" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                <div style={{ ...mono, fontSize: 10, color: T.textFaint, marginTop: 2 }}>ETA {fmtDate(item.eta)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <button onClick={() => cycleProcStatus(item.id)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                  <Badge tone={procTone(item.status)}>{item.status}</Badge>
                </button>
                <IconBtn danger title="Remove" onClick={() => removeProc(item.id)}><Trash2 size={12} /></IconBtn>
              </div>
            </div>
          ))}
        </div>
        <TinyAddRow
          placeholder="Add material"
          onAdd={addProcurement}
          extraFields={[{ key: "eta", type: "date" }]}
        />
      </div>

      {/* Installation */}
      <div>
        <SectionLabel icon={<HardHat size={13} />} action={<span style={{ ...mono, fontSize: 10.5, color: T.amber }}>{pct}%</span>}>
          Installation
        </SectionLabel>
        <div style={{ height: 4, background: T.border, borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: T.amber, transition: "width .3s" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {project.installation.length === 0 && <div style={{ ...mono, fontSize: 11, color: T.textFaint }}>No milestones yet.</div>}
          {project.installation.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 9px" }}>
              <button onClick={() => toggleMilestone(m.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                <CheckCircle2 size={16} color={m.done ? T.green : T.textFaint} fill={m.done ? T.greenDim : "none"} />
              </button>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, color: m.done ? T.textDim : T.text, textDecoration: m.done ? "line-through" : "none" }}>{m.name}</div>
                <div style={{ ...mono, fontSize: 10, color: T.textFaint, marginTop: 2 }}>{fmtDate(m.date)}</div>
              </div>
              <IconBtn danger title="Remove" onClick={() => removeMilestone(m.id)}><Trash2 size={12} /></IconBtn>
            </div>
          ))}
        </div>
        <TinyAddRow placeholder="Add milestone" onAdd={addMilestone} extraFields={[{ key: "date", type: "date" }]} />
      </div>

      {/* Maintenance */}
      <div>
        <SectionLabel icon={<CalendarClock size={13} />}>Maintenance</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {project.maintenance.length === 0 && <div style={{ ...mono, fontSize: 11, color: T.textFaint }}>Nothing scheduled.</div>}
          {project.maintenance
            .slice()
            .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
            .map((m) => {
              const overdue = m.status !== "Done" && daysUntil(m.dueDate) < 0;
              const effStatus = overdue ? "Overdue" : m.status;
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 9px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.task}</div>
                    <div style={{ ...mono, fontSize: 10, color: T.textFaint, marginTop: 2 }}>Due {fmtDate(m.dueDate)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => cycleMaintStatus(m.id)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                      <Badge tone={maintTone(effStatus)}>{effStatus}</Badge>
                    </button>
                    <IconBtn danger title="Remove" onClick={() => removeMaint(m.id)}><Trash2 size={12} /></IconBtn>
                  </div>
                </div>
              );
            })}
        </div>
        <TinyAddRow placeholder="Schedule task" onAdd={addMaint} extraFields={[{ key: "dueDate", type: "date" }]} />
      </div>
    </div>
  );
}

function AddProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [capacityKw, setCapacityKw] = useState("");
  const [phase, setPhase] = useState("Planning");
  const [ptoDate, setPtoDate] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onCreate({
      id: uid(), name: name.trim(), location: location.trim(), capacityKw: Number(capacityKw) || 0,
      phase, ptoDate, procurement: [], installation: [], maintenance: [],
    });
    onClose();
  };

  const field = { ...mono, fontSize: 13, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 11px", color: T.text, width: "100%" };
  const label = { ...mono, fontSize: 10.5, color: T.textDim, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000aa", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: T.panel, border: `1px solid ${T.borderLight}`, borderRadius: 10, padding: 22, width: 420, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ ...display, fontSize: 17, color: T.text, margin: 0 }}>New project</h3>
          <IconBtn onClick={onClose}><X size={16} /></IconBtn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={label}>Project name</label>
            <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Malita Solar Farm" autoFocus />
          </div>
          <div>
            <label style={label}>Location</label>
            <input style={field} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Malita, Davao Occidental" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Capacity (kW)</label>
              <input style={field} type="number" value={capacityKw} onChange={(e) => setCapacityKw(e.target.value)} placeholder="1000" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Target PTO</label>
              <input style={field} type="date" value={ptoDate} onChange={(e) => setPtoDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={label}>Starting phase</label>
            <select style={field} value={phase} onChange={(e) => setPhase(e.target.value)}>
              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button
            onClick={submit}
            style={{ ...display, fontWeight: 600, fontSize: 14, background: T.amber, color: T.bg, border: "none", borderRadius: 7, padding: "10px 14px", cursor: "pointer", marginTop: 6 }}
          >
            Create project
          </button>
        </div>
      </div>
    </div>
  );
}

function AddInventoryModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(INVENTORY_CATEGORIES[0]);
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(UNITS[0]);
  const [reorderLevel, setReorderLevel] = useState("");
  const [supplier, setSupplier] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onCreate({
      id: uid(), name: name.trim(), category, sku: sku.trim(),
      quantity: Number(quantity) || 0, unit, reorderLevel: Number(reorderLevel) || 0,
      supplier: supplier.trim(), unitCost: Number(unitCost) || 0,
    });
    onClose();
  };

  const field = { ...mono, fontSize: 13, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 11px", color: T.text, width: "100%" };
  const label = { ...mono, fontSize: 10.5, color: T.textDim, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000aa", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: T.panel, border: `1px solid ${T.borderLight}`, borderRadius: 10, padding: 22, width: 440, maxWidth: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ ...display, fontSize: 17, color: T.text, margin: 0 }}>New inventory item</h3>
          <IconBtn onClick={onClose}><X size={16} /></IconBtn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={label}>Item name</label>
            <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 540W Monocrystalline Module" autoFocus />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Category</label>
              <select style={field} value={category} onChange={(e) => setCategory(e.target.value)}>
                {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>SKU</label>
              <input style={field} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. MOD-540-MC" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Quantity</label>
              <input style={field} type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Unit</label>
              <select style={field} value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Reorder at</label>
              <input style={field} type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Supplier</label>
              <input style={field} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. SunTech Philippines" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Unit cost (₱)</label>
              <input style={field} type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <button
            onClick={submit}
            style={{ ...display, fontWeight: 600, fontSize: 14, background: T.amber, color: T.bg, border: "none", borderRadius: 7, padding: "10px 14px", cursor: "pointer", marginTop: 6 }}
          >
            Add item
          </button>
        </div>
      </div>
    </div>
  );
}

function QuantityStepper({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 4px" }}>
      <IconBtn title="Decrease" onClick={() => onChange(Math.max(0, value - 1))}><Minus size={12} /></IconBtn>
      <span style={{ ...mono, fontSize: 13, color: T.text, minWidth: 34, textAlign: "center" }}>{value}</span>
      <IconBtn title="Increase" onClick={() => onChange(value + 1)}><Plus size={12} /></IconBtn>
    </div>
  );
}

function InventoryCard({ item, update, remove }) {
  const [editing, setEditing] = useState(false);
  const [supplierDraft, setSupplierDraft] = useState(item.supplier || "");
  const [reorderDraft, setReorderDraft] = useState(item.reorderLevel);
  const [unitCostDraft, setUnitCostDraft] = useState(item.unitCost || 0);

  const low = item.quantity <= item.reorderLevel;
  const totalValue = item.quantity * (item.unitCost || 0);

  const openSettings = () => {
    setSupplierDraft(item.supplier || "");
    setReorderDraft(item.reorderLevel);
    setUnitCostDraft(item.unitCost || 0);
    setEditing(true);
  };
  const saveSettings = () => {
    update({
      ...item,
      supplier: supplierDraft.trim(),
      reorderLevel: Number(reorderDraft) || 0,
      unitCost: Number(unitCostDraft) || 0,
    });
    setEditing(false);
  };

  const field = { ...mono, fontSize: 12.5, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 5, padding: "6px 9px", color: T.text };
  const label = { ...mono, fontSize: 10, color: T.textDim, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4, display: "block" };

  return (
    <div style={{ background: T.panel, border: `1px solid ${low ? T.red + "55" : T.border}`, borderRadius: 10, padding: "13px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px", minWidth: 180 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...display, fontSize: 14.5, color: T.text, fontWeight: 600 }}>{item.name}</span>
            {low && <Badge tone="red">Low stock</Badge>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
            <Badge tone="blue">{item.category}</Badge>
            {item.sku && <span style={{ ...mono, fontSize: 10.5, color: T.textFaint }}>{item.sku}</span>}
            {item.supplier && (
              <span style={{ ...mono, fontSize: 10.5, color: T.textFaint, display: "flex", alignItems: "center", gap: 3 }}>
                <Truck size={10} /> {item.supplier}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 70 }}>
          <div style={{ ...mono, fontSize: 10, color: T.textFaint }}>Reorder at</div>
          <div style={{ ...mono, fontSize: 12, color: T.textDim }}>{item.reorderLevel} {item.unit}</div>
        </div>
        {item.unitCost > 0 && (
          <div style={{ textAlign: "right", minWidth: 80 }}>
            <div style={{ ...mono, fontSize: 10, color: T.textFaint }}>Stock value</div>
            <div style={{ ...mono, fontSize: 12, color: T.textDim }}>₱{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ ...mono, fontSize: 10.5, color: T.textFaint }}>{item.unit}</span>
          <QuantityStepper value={item.quantity} onChange={(q) => update({ ...item, quantity: q })} />
        </div>
        <IconBtn title="Edit supplier & reorder settings" onClick={editing ? () => setEditing(false) : openSettings}>
          <Settings size={14} color={editing ? T.amber : undefined} />
        </IconBtn>
        <IconBtn danger title="Remove item" onClick={() => remove(item.id)}><Trash2 size={14} /></IconBtn>
      </div>

      {editing && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
          <div style={{ flex: "1 1 180px" }}>
            <label style={label}>Supplier</label>
            <input
              style={{ ...field, width: "100%" }}
              value={supplierDraft}
              onChange={(e) => setSupplierDraft(e.target.value)}
              placeholder="e.g. SunTech Philippines"
              autoFocus
            />
          </div>
          <div style={{ width: 110 }}>
            <label style={label}>Reorder at</label>
            <input
              style={{ ...field, width: "100%" }}
              type="number"
              value={reorderDraft}
              onChange={(e) => setReorderDraft(e.target.value)}
            />
          </div>
          <div style={{ width: 130 }}>
            <label style={label}>Unit cost (₱)</label>
            <input
              style={{ ...field, width: "100%" }}
              type="number"
              value={unitCostDraft}
              onChange={(e) => setUnitCostDraft(e.target.value)}
            />
          </div>
          <button
            onClick={saveSettings}
            style={{ ...mono, fontSize: 11, fontWeight: 600, background: T.amber, color: T.bg, border: "none", borderRadius: 5, padding: "7px 12px", cursor: "pointer" }}
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            style={{ ...mono, fontSize: 11, background: "transparent", color: T.textDim, border: `1px solid ${T.border}`, borderRadius: 5, padding: "7px 10px", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, tone }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 130 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: tone || T.textDim, marginBottom: 8 }}>
        {icon}
        <span style={{ ...mono, fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ ...display, fontSize: 26, color: T.text, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ ...mono, fontSize: 10.5, color: T.textFaint, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

export default function SolarPortfolioTracker() {
  const [activeTab, setActiveTab] = useState("projects");

  const [projects, setProjects] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [saveErr, setSaveErr] = useState(false);

  const [inventory, setInventory] = useState(null);
  const [invQuery, setInvQuery] = useState("");
  const [invCategoryFilter, setInvCategoryFilter] = useState("All");
  const [showAddInv, setShowAddInv] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("solar-portfolio-projects");
      if (raw) {
        setProjects(JSON.parse(raw));
      } else {
        const seed = seedProjects();
        setProjects(seed);
        localStorage.setItem("solar-portfolio-projects", JSON.stringify(seed));
      }
    } catch (e) {
      setProjects(seedProjects());
    } finally {
      setLoading(false);
    }

    try {
      const rawInv = localStorage.getItem("solar-portfolio-inventory");
      if (rawInv) {
        setInventory(JSON.parse(rawInv));
      } else {
        const seedInv = seedInventory();
        setInventory(seedInv);
        localStorage.setItem("solar-portfolio-inventory", JSON.stringify(seedInv));
      }
    } catch (e) {
      setInventory(seedInventory());
    }
  }, []);

  const persist = (next) => {
    setProjects(next);
    try {
      localStorage.setItem("solar-portfolio-projects", JSON.stringify(next));
      setSaveErr(false);
    } catch (e) {
      setSaveErr(true);
    }
  };

  const updateProject = (updated) => {
    persist(projects.map((p) => (p.id === updated.id ? updated : p)));
  };
  const createProject = (p) => persist([p, ...projects]);
  const deleteProject = (id) => persist(projects.filter((p) => p.id !== id));

  const persistInventory = (next) => {
    setInventory(next);
    try {
      localStorage.setItem("solar-portfolio-inventory", JSON.stringify(next));
      setSaveErr(false);
    } catch (e) {
      setSaveErr(true);
    }
  };
  const updateInvItem = (updated) => persistInventory(inventory.map((i) => (i.id === updated.id ? updated : i)));
  const createInvItem = (item) => persistInventory([item, ...inventory]);
  const deleteInvItem = (id) => persistInventory(inventory.filter((i) => i.id !== id));

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      const matchQ = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.location.toLowerCase().includes(query.toLowerCase());
      const matchP = phaseFilter === "All" || p.phase === phaseFilter;
      return matchQ && matchP;
    });
  }, [projects, query, phaseFilter]);

  const stats = useMemo(() => {
    if (!projects) return null;
    const totalKw = projects.reduce((s, p) => s + (p.capacityKw || 0), 0);
    const allMaint = projects.flatMap((p) => p.maintenance.map((m) => ({ ...m, project: p.name })));
    const overdue = allMaint.filter((m) => m.status !== "Done" && daysUntil(m.dueDate) < 0).length;
    const upcoming = allMaint.filter((m) => m.status !== "Done" && daysUntil(m.dueDate) >= 0 && daysUntil(m.dueDate) <= 7).length;
    const operational = projects.filter((p) => p.phase === "Operational").length;
    return { totalKw, overdue, upcoming, operational, count: projects.length };
  }, [projects]);

  const filteredInv = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter((i) => {
      const matchQ = !invQuery || i.name.toLowerCase().includes(invQuery.toLowerCase()) || (i.sku || "").toLowerCase().includes(invQuery.toLowerCase());
      const matchC = invCategoryFilter === "All" || i.category === invCategoryFilter;
      return matchQ && matchC;
    });
  }, [inventory, invQuery, invCategoryFilter]);

  const invStats = useMemo(() => {
    if (!inventory) return null;
    const totalUnits = inventory.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalValue = inventory.reduce((s, i) => s + (i.quantity || 0) * (i.unitCost || 0), 0);
    const lowStock = inventory.filter((i) => i.quantity <= i.reorderLevel).length;
    return { skus: inventory.length, totalUnits, totalValue, lowStock };
  }, [inventory]);

  return (
    <div style={{ background: T.bg, minHeight: 500, padding: "22px 20px 40px", borderRadius: 14, position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input:focus, select:focus { outline: 1.5px solid ${T.amber}; }
        ::placeholder { color: ${T.textFaint}; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: T.amberDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sun size={18} color={T.amber} />
          </div>
          <div>
            <h1 style={{ ...display, fontSize: 19, color: T.text, margin: 0, fontWeight: 700 }}>Solar Portfolio Tracker</h1>
            <div style={{ ...mono, fontSize: 10.5, color: T.textFaint }}>Procurement · Installation · Maintenance · Inventory</div>
          </div>
        </div>
        <button
          onClick={() => (activeTab === "projects" ? setShowAdd(true) : setShowAddInv(true))}
          style={{ ...display, fontWeight: 600, fontSize: 13, background: T.amber, color: T.bg, border: "none", borderRadius: 7, padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={15} /> {activeTab === "projects" ? "New project" : "New item"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, background: T.panelAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: 3, width: "fit-content" }}>
        {[
          { id: "projects", label: "Projects", icon: <Sun size={13} /> },
          { id: "inventory", label: "Inventory", icon: <Boxes size={13} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...display, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer",
              background: activeTab === tab.id ? T.amber : "transparent",
              color: activeTab === tab.id ? T.bg : T.textDim,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.textDim, ...mono, fontSize: 12, padding: 30 }}>
          <Loader2 size={14} className="spin" /> Loading portfolio…
        </div>
      ) : activeTab === "projects" ? (
        <>
          {/* Stats */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <StatCard icon={<Zap size={12} />} label="Portfolio" value={stats.count} sub={`${(stats.totalKw / 1000).toFixed(2)} MW total`} />
            <StatCard icon={<CheckCircle2 size={12} />} label="Operational" value={stats.operational} sub="sites generating" tone={T.green} />
            <StatCard icon={<Clock size={12} />} label="Due this week" value={stats.upcoming} sub="maintenance tasks" tone={T.blue} />
            <StatCard icon={<AlertTriangle size={12} />} label="Overdue" value={stats.overdue} sub="needs attention" tone={stats.overdue > 0 ? T.red : T.textDim} />
          </div>

          {/* Toolbar */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 11px", flex: "1 1 220px" }}>
              <Search size={14} color={T.textFaint} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects or location…"
                style={{ ...mono, fontSize: 12.5, background: "transparent", border: "none", color: T.text, width: "100%" }}
              />
            </div>
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              style={{ ...mono, fontSize: 12, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px", color: T.text }}
            >
              <option value="All">All phases</option>
              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Project list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.length === 0 && (
              <div style={{ ...mono, fontSize: 12, color: T.textFaint, padding: "24px 0", textAlign: "center" }}>
                No projects match. Try clearing filters, or add a new project.
              </div>
            )}
            {filtered.map((p) => {
              const isOpen = expanded === p.id;
              const overdueCount = p.maintenance.filter((m) => m.status !== "Done" && daysUntil(m.dueDate) < 0).length;
              return (
                <div key={p.id} style={{ background: T.panel, border: `1px solid ${isOpen ? T.borderLight : T.border}`, borderRadius: 10, overflow: "hidden" }}>
                  <div
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 16px", cursor: "pointer", flexWrap: "wrap" }}
                  >
                    <div style={{ flex: "1 1 200px", minWidth: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ ...display, fontSize: 14.5, color: T.text, fontWeight: 600 }}>{p.name}</span>
                        {overdueCount > 0 && <Badge tone="red">{overdueCount} overdue</Badge>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, color: T.textFaint }}>
                        <MapPin size={11} />
                        <span style={{ ...mono, fontSize: 11 }}>{p.location || "—"}</span>
                        <span style={{ ...mono, fontSize: 11, marginLeft: 8 }}>{(p.capacityKw / 1000).toFixed(2)} MW</span>
                      </div>
                    </div>
                    <PhaseRail phase={p.phase} />
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ ...mono, fontSize: 10, color: T.textFaint }}>Target PTO</div>
                        <div style={{ ...mono, fontSize: 11.5, color: T.textDim }}>{fmtDate(p.ptoDate)}</div>
                      </div>
                      <IconBtn danger title="Delete project" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}>
                        <Trash2 size={14} />
                      </IconBtn>
                      <ChevronDown size={16} color={T.textDim} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                    </div>
                  </div>
                  {isOpen && <ProjectDetail project={p} update={updateProject} />}
                </div>
              );
            })}
          </div>

          {saveErr && (
            <div style={{ ...mono, fontSize: 11, color: T.red, marginTop: 14, textAlign: "center" }}>
              Couldn't save your last change — it may not persist after reload.
            </div>
          )}
        </>
      ) : (
        <>
          {/* Inventory stats */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <StatCard icon={<Boxes size={12} />} label="SKUs tracked" value={invStats.skus} sub={`${invStats.totalUnits.toLocaleString()} units total`} />
            <StatCard icon={<AlertTriangle size={12} />} label="Low stock" value={invStats.lowStock} sub="at or below reorder level" tone={invStats.lowStock > 0 ? T.red : T.textDim} />
            <StatCard icon={<DollarSign size={12} />} label="Stock value" value={`₱${invStats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="at current unit cost" tone={T.green} />
          </div>

          {/* Inventory toolbar */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 11px", flex: "1 1 220px" }}>
              <Search size={14} color={T.textFaint} />
              <input
                value={invQuery}
                onChange={(e) => setInvQuery(e.target.value)}
                placeholder="Search items or SKU…"
                style={{ ...mono, fontSize: 12.5, background: "transparent", border: "none", color: T.text, width: "100%" }}
              />
            </div>
            <select
              value={invCategoryFilter}
              onChange={(e) => setInvCategoryFilter(e.target.value)}
              style={{ ...mono, fontSize: 12, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px", color: T.text }}
            >
              <option value="All">All categories</option>
              {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={() => downloadInventoryCsv(inventory)}
              title="Download a CSV backup of your inventory"
              style={{
                ...mono, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
                background: T.panel, color: T.textDim, border: `1px solid ${T.border}`, borderRadius: 7,
                padding: "8px 12px", cursor: "pointer",
              }}
            >
              <Download size={13} /> Backup CSV
            </button>
          </div>

          {/* Inventory list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredInv.length === 0 && (
              <div style={{ ...mono, fontSize: 12, color: T.textFaint, padding: "24px 0", textAlign: "center" }}>
                No items match. Try clearing filters, or add a new item.
              </div>
            )}
            {filteredInv.map((item) => (
              <InventoryCard key={item.id} item={item} update={updateInvItem} remove={deleteInvItem} />
            ))}
          </div>

          {saveErr && (
            <div style={{ ...mono, fontSize: 11, color: T.red, marginTop: 14, textAlign: "center" }}>
              Couldn't save your last change — it may not persist after reload.
            </div>
          )}
        </>
      )}

      {showAdd && <AddProjectModal onClose={() => setShowAdd(false)} onCreate={createProject} />}
      {showAddInv && <AddInventoryModal onClose={() => setShowAddInv(false)} onCreate={createInvItem} />}
    </div>
  );
}
