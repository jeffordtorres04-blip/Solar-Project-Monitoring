const { useState, useEffect, useMemo, Fragment } = React;

const PHASES = ["Planning", "Procurement", "Installation", "Commissioning", "Operational"];
const PHASE_SHORT = { Planning: "PLAN", Procurement: "PROC", Installation: "INST", Commissioning: "COMM", Operational: "OPS" };
const INVENTORY_CATEGORIES = ["Modules", "Inverters", "Racking", "Cabling", "Electrical", "Tools", "Other"];
const UNITS = ["pcs", "units", "m", "rolls", "boxes", "sets"];

const T = {
  bg: "#0C1626", panel: "#12213A", panelAlt: "#0F1C30",
  border: "#22354F", borderLight: "#2C4364",
  text: "#E7EDF5", textDim: "#8FA1B8", textFaint: "#5C7089",
  amber: "#F5A623", amberDim: "#8A6321",
  green: "#4ADE80", greenDim: "#1F4A34",
  red: "#F87171", redDim: "#4A2323",
  blue: "#60A5FA", blueDim: "#1F3352",
};
const display = { fontFamily: "'Space Grotesk', sans-serif" };
const mono = { fontFamily: "'IBM Plex Mono', monospace" };

const API = "/api";
async function api(method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error("Request failed: " + res.status);
  return res.json();
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const daysUntil = (d) => {
  if (!d) return 9999;
  const dt = new Date(d + "T00:00:00");
  const now = new Date(todayISO() + "T00:00:00");
  return Math.round((dt - now) / 86400000);
};
const phaseIndex = (p) => Math.max(0, PHASES.indexOf(p));

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

function PhaseRail({ phase, onChange }) {
  const idx = phaseIndex(phase);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 220 }}>
      {PHASES.map((p, i) => {
        const state = i < idx ? "done" : i === idx ? "current" : "future";
        const dot = (
          <div style={{
            width: 12, height: 12, borderRadius: 999,
            background: state === "done" ? T.amberDim : state === "current" ? T.amber : "transparent",
            border: `1.5px solid ${state === "future" ? T.borderLight : T.amber}`,
            boxShadow: state === "current" ? `0 0 0 3px ${T.amber}33` : "none",
          }} />
        );
        return (
          <Fragment key={p}>
            {onChange ? (
              <button
                onClick={(e) => { e.stopPropagation(); onChange(p); }}
                title={`Set phase to ${p}`}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
              >
                {dot}
                <span style={{ ...mono, fontSize: 8, letterSpacing: "0.05em", color: state === "future" ? T.textFaint : T.textDim }}>
                  {PHASE_SHORT[p]}
                </span>
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                {dot}
                <span style={{ ...mono, fontSize: 8, letterSpacing: "0.05em", color: state === "future" ? T.textFaint : T.textDim }}>
                  {PHASE_SHORT[p]}
                </span>
              </div>
            )}
            {i < PHASES.length - 1 && (
              <div style={{ flex: 1, height: 1.5, background: i < idx ? T.amberDim : T.border, marginBottom: 14 }} />
            )}
          </Fragment>
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
    <span style={{ ...mono, fontSize: 10.5, letterSpacing: "0.03em", padding: "2px 7px", borderRadius: 4, background: c.bg, color: c.fg, border: `1px solid ${c.bd}44`, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}
const procTone = (s) => (s === "Delivered" ? "green" : s === "Shipped" ? "blue" : "neutral");
const maintTone = (s) => (s === "Done" ? "green" : s === "Overdue" ? "red" : "amber");

function IconBtn({ onClick, children, title, danger }) {
  return (
    <button onClick={onClick} title={title}
      style={{ background: "transparent", border: "none", cursor: "pointer", color: danger ? T.red : T.textDim, padding: 4, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? T.redDim : T.panelAlt)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      {children}
    </button>
  );
}

function SectionLabel({ children, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div style={{ ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textDim }}>{children}</div>
      {action}
    </div>
  );
}

function TinyAddRow({ placeholder, onAdd, dateKey }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [dateVal, setDateVal] = useState("");
  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ ...mono, fontSize: 11, color: T.amber, background: "transparent", border: `1px dashed ${T.amberDim}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", marginTop: 4 }}>
        + {placeholder}
      </button>
    );
  }
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 6, background: T.panelAlt, padding: 8, borderRadius: 6, border: `1px solid ${T.border}` }}>
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder="Name"
        style={{ ...mono, fontSize: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, padding: "6px 8px", color: T.text, flex: "1 1 160px", minWidth: 120 }} />
      {dateKey && (
        <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)}
          style={{ ...mono, fontSize: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, padding: "6px 8px", color: T.text }} />
      )}
      <button onClick={() => { if (!val.trim()) return; onAdd({ name: val.trim(), [dateKey]: dateVal }); setVal(""); setDateVal(""); setOpen(false); }}
        style={{ ...mono, fontSize: 11, background: T.amber, color: T.bg, border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontWeight: 600 }}>
        Add
      </button>
      <button onClick={() => { setOpen(false); setVal(""); setDateVal(""); }}
        style={{ ...mono, fontSize: 11, background: "transparent", color: T.textDim, border: `1px solid ${T.border}`, borderRadius: 4, padding: "6px 8px", cursor: "pointer" }}>
        Cancel
      </button>
    </div>
  );
}

function ProjectDetail({ project, refresh }) {
  const doneCount = project.installation.filter((m) => m.done).length;
  const pct = project.installation.length ? Math.round((doneCount / project.installation.length) * 100) : 0;

  const addProc = async (item) => { await api("POST", `/projects/${project.id}/procurement`, { name: item.name, eta: item.eta || null }); refresh(); };
  const cycleProc = async (item) => {
    const order = ["Ordered", "Shipped", "Delivered"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    await api("PATCH", `/procurement/${item.id}`, { status: next }); refresh();
  };
  const removeProc = async (id) => { await api("DELETE", `/procurement/${id}`); refresh(); };

  const addMilestone = async (item) => { await api("POST", `/projects/${project.id}/milestones`, { name: item.name, date: item.date || null }); refresh(); };
  const toggleMilestone = async (m) => { await api("PATCH", `/milestones/${m.id}`, { done: !m.done }); refresh(); };
  const removeMilestone = async (id) => { await api("DELETE", `/milestones/${id}`); refresh(); };

  const addMaint = async (item) => { await api("POST", `/projects/${project.id}/maintenance`, { task: item.name, dueDate: item.dueDate || todayISO() }); refresh(); };
  const cycleMaint = async (m) => {
    const next = m.status === "Done" ? "Scheduled" : "Done";
    await api("PATCH", `/maintenance/${m.id}`, { status: next }); refresh();
  };
  const removeMaint = async (id) => { await api("DELETE", `/maintenance/${id}`); refresh(); };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, padding: "18px 20px", background: T.panelAlt, borderTop: `1px solid ${T.border}` }}>
      <div>
        <SectionLabel>Procurement</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {project.procurement.length === 0 && <div style={{ ...mono, fontSize: 11, color: T.textFaint }}>No items yet.</div>}
          {project.procurement.map((item) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 9px" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                <div style={{ ...mono, fontSize: 10, color: T.textFaint, marginTop: 2 }}>ETA {fmtDate(item.eta)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <button onClick={() => cycleProc(item)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                  <Badge tone={procTone(item.status)}>{item.status}</Badge>
                </button>
                <IconBtn danger title="Remove" onClick={() => removeProc(item.id)}>✕</IconBtn>
              </div>
            </div>
          ))}
        </div>
        <TinyAddRow placeholder="Add material" onAdd={addProc} dateKey="eta" />
      </div>

      <div>
        <SectionLabel action={<span style={{ ...mono, fontSize: 10.5, color: T.amber }}>{pct}%</span>}>Installation</SectionLabel>
        <div style={{ height: 4, background: T.border, borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: T.amber, transition: "width .3s" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {project.installation.length === 0 && <div style={{ ...mono, fontSize: 11, color: T.textFaint }}>No milestones yet.</div>}
          {project.installation.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 9px" }}>
              <button onClick={() => toggleMilestone(m)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, color: m.done ? T.green : T.textFaint, fontSize: 15 }}>
                {m.done ? "●" : "○"}
              </button>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, color: m.done ? T.textDim : T.text, textDecoration: m.done ? "line-through" : "none" }}>{m.name}</div>
                <div style={{ ...mono, fontSize: 10, color: T.textFaint, marginTop: 2 }}>{fmtDate(m.date)}</div>
              </div>
              <IconBtn danger title="Remove" onClick={() => removeMilestone(m.id)}>✕</IconBtn>
            </div>
          ))}
        </div>
        <TinyAddRow placeholder="Add milestone" onAdd={addMilestone} dateKey="date" />
      </div>

      <div>
        <SectionLabel>Maintenance</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {project.maintenance.length === 0 && <div style={{ ...mono, fontSize: 11, color: T.textFaint }}>Nothing scheduled.</div>}
          {project.maintenance.slice().sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")).map((m) => {
            const overdue = m.status !== "Done" && daysUntil(m.dueDate) < 0;
            const effStatus = overdue ? "Overdue" : m.status;
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 9px" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.task}</div>
                  <div style={{ ...mono, fontSize: 10, color: T.textFaint, marginTop: 2 }}>Due {fmtDate(m.dueDate)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => cycleMaint(m)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                    <Badge tone={maintTone(effStatus)}>{effStatus}</Badge>
                  </button>
                  <IconBtn danger title="Remove" onClick={() => removeMaint(m.id)}>✕</IconBtn>
                </div>
              </div>
            );
          })}
        </div>
        <TinyAddRow placeholder="Schedule task" onAdd={addMaint} dateKey="dueDate" />
      </div>
    </div>
  );
}

function ProjectRow({ project: p, isOpen, onToggle, refresh }) {
  const [editingContact, setEditingContact] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(p.contactPhone || "");
  const [emailDraft, setEmailDraft] = useState(p.contactEmail || "");

  const overdueCount = p.maintenance.filter((m) => m.status !== "Done" && daysUntil(m.dueDate) < 0).length;

  const openContactEdit = (e) => {
    e.stopPropagation();
    setPhoneDraft(p.contactPhone || "");
    setEmailDraft(p.contactEmail || "");
    setEditingContact(true);
  };
  const saveContact = async () => {
    await api("PUT", `/projects/${p.id}`, { contactPhone: phoneDraft.trim(), contactEmail: emailDraft.trim() });
    setEditingContact(false);
    refresh();
  };
  const setPhase = async (phase) => { await api("PUT", `/projects/${p.id}`, { phase }); refresh(); };
  const deleteProject = async (e) => { e.stopPropagation(); await api("DELETE", `/projects/${p.id}`); refresh(); };

  const field = { ...mono, fontSize: 12.5, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 5, padding: "6px 9px", color: T.text };
  const label = { ...mono, fontSize: 10, color: T.textDim, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4, display: "block" };

  return (
    <div style={{ background: T.panel, border: `1px solid ${isOpen ? T.borderLight : T.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 16px", cursor: "pointer", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px", minWidth: 160 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...display, fontSize: 14.5, color: T.text, fontWeight: 600 }}>{p.name}</span>
            {overdueCount > 0 && <Badge tone="red">{overdueCount} overdue</Badge>}
          </div>
          <div style={{ ...mono, fontSize: 11, color: T.textFaint, marginTop: 3 }}>
            {p.location || "—"} · {p.capacityKw.toLocaleString()} kW
          </div>
          {(p.contactPhone || p.contactEmail) && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
              {p.contactPhone && <span style={{ ...mono, fontSize: 10.5, color: T.textFaint }}>☎ {p.contactPhone}</span>}
              {p.contactEmail && <span style={{ ...mono, fontSize: 10.5, color: T.textFaint }}>✉ {p.contactEmail}</span>}
            </div>
          )}
        </div>
        <PhaseRail phase={p.phase} onChange={setPhase} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ ...mono, fontSize: 10, color: T.textFaint }}>Target PTO</div>
            <div style={{ ...mono, fontSize: 11.5, color: T.textDim }}>{fmtDate(p.ptoDate)}</div>
          </div>
          <IconBtn title="Edit contact info" onClick={editingContact ? (e) => { e.stopPropagation(); setEditingContact(false); } : openContactEdit}>
            <span style={{ color: editingContact ? T.amber : undefined }}>⚙</span>
          </IconBtn>
          <IconBtn danger title="Delete project" onClick={deleteProject}>🗑</IconBtn>
          <span style={{ color: T.textDim, transform: isOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform .2s" }}>▾</span>
        </div>
      </div>

      {editingContact && (
        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", padding: "12px 16px", background: T.panelAlt, borderTop: `1px solid ${T.border}` }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={label}>Contact number</label>
            <input style={{ ...field, width: "100%" }} value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} placeholder="e.g. +63 917 234 5678" autoFocus />
          </div>
          <div style={{ flex: "1 1 220px" }}>
            <label style={label}>Contact email</label>
            <input style={{ ...field, width: "100%" }} type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="e.g. site@example.com" />
          </div>
          <button onClick={saveContact} style={{ ...mono, fontSize: 11, fontWeight: 600, background: T.amber, color: T.bg, border: "none", borderRadius: 5, padding: "7px 12px", cursor: "pointer" }}>Save</button>
          <button onClick={() => setEditingContact(false)} style={{ ...mono, fontSize: 11, background: "transparent", color: T.textDim, border: `1px solid ${T.border}`, borderRadius: 5, padding: "7px 10px", cursor: "pointer" }}>Cancel</button>
        </div>
      )}

      {isOpen && <ProjectDetail project={p} refresh={refresh} />}
    </div>
  );
}

function AddProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [capacityKw, setCapacityKw] = useState("");
  const [phase, setPhase] = useState("Planning");
  const [ptoDate, setPtoDate] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    await onCreate({
      name: name.trim(), location: location.trim(), capacityKw: Number(capacityKw) || 0,
      phase, ptoDate: ptoDate || null, contactPhone: contactPhone.trim(), contactEmail: contactEmail.trim(),
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
          <IconBtn onClick={onClose}>✕</IconBtn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={label}>Project name</label>
            <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Malita Solar Farm" autoFocus /></div>
          <div><label style={label}>Location</label>
            <input style={field} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Malita, Davao Occidental" /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><label style={label}>Capacity (kW)</label>
              <input style={field} type="number" value={capacityKw} onChange={(e) => setCapacityKw(e.target.value)} placeholder="1000" /></div>
            <div style={{ flex: 1 }}><label style={label}>Target PTO</label>
              <input style={field} type="date" value={ptoDate} onChange={(e) => setPtoDate(e.target.value)} /></div>
          </div>
          <div><label style={label}>Starting phase</label>
            <select style={field} value={phase} onChange={(e) => setPhase(e.target.value)}>
              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><label style={label}>Contact number</label>
              <input style={field} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="e.g. +63 917 234 5678" /></div>
            <div style={{ flex: 1 }}><label style={label}>Contact email</label>
              <input style={field} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="e.g. site@example.com" /></div>
          </div>
          <button onClick={submit} style={{ ...display, fontWeight: 600, fontSize: 14, background: T.amber, color: T.bg, border: "none", borderRadius: 7, padding: "10px 14px", cursor: "pointer", marginTop: 6 }}>
            Create project
          </button>
        </div>
      </div>
    </div>
  );
}

function QuantityStepper({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 4px" }}>
      <IconBtn title="Decrease" onClick={() => onChange(Math.max(0, value - 1))}>−</IconBtn>
      <span style={{ ...mono, fontSize: 13, color: T.text, minWidth: 34, textAlign: "center" }}>{value}</span>
      <IconBtn title="Increase" onClick={() => onChange(value + 1)}>+</IconBtn>
    </div>
  );
}

function InventoryCard({ item, refresh }) {
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
  const saveSettings = async () => {
    await api("PATCH", `/inventory/${item.id}`, {
      supplier: supplierDraft.trim(),
      reorderLevel: Number(reorderDraft) || 0,
      unitCost: Number(unitCostDraft) || 0,
    });
    setEditing(false);
    refresh();
  };
  const setQuantity = async (q) => { await api("PATCH", `/inventory/${item.id}`, { quantity: q }); refresh(); };
  const removeItem = async () => { await api("DELETE", `/inventory/${item.id}`); refresh(); };

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
            {item.supplier && <span style={{ ...mono, fontSize: 10.5, color: T.textFaint }}>🚚 {item.supplier}</span>}
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
          <QuantityStepper value={item.quantity} onChange={setQuantity} />
        </div>
        <IconBtn title="Edit supplier & reorder settings" onClick={editing ? () => setEditing(false) : openSettings}>
          <span style={{ color: editing ? T.amber : undefined }}>⚙</span>
        </IconBtn>
        <IconBtn danger title="Remove item" onClick={removeItem}>🗑</IconBtn>
      </div>

      {editing && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
          <div style={{ flex: "1 1 180px" }}>
            <label style={label}>Supplier</label>
            <input style={{ ...field, width: "100%" }} value={supplierDraft} onChange={(e) => setSupplierDraft(e.target.value)} placeholder="e.g. SunTech Philippines" autoFocus />
          </div>
          <div style={{ width: 110 }}>
            <label style={label}>Reorder at</label>
            <input style={{ ...field, width: "100%" }} type="number" value={reorderDraft} onChange={(e) => setReorderDraft(e.target.value)} />
          </div>
          <div style={{ width: 130 }}>
            <label style={label}>Unit cost (₱)</label>
            <input style={{ ...field, width: "100%" }} type="number" value={unitCostDraft} onChange={(e) => setUnitCostDraft(e.target.value)} />
          </div>
          <button onClick={saveSettings} style={{ ...mono, fontSize: 11, fontWeight: 600, background: T.amber, color: T.bg, border: "none", borderRadius: 5, padding: "7px 12px", cursor: "pointer" }}>Save</button>
          <button onClick={() => setEditing(false)} style={{ ...mono, fontSize: 11, background: "transparent", color: T.textDim, border: `1px solid ${T.border}`, borderRadius: 5, padding: "7px 10px", cursor: "pointer" }}>Cancel</button>
        </div>
      )}
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

  const submit = async () => {
    if (!name.trim()) return;
    await onCreate({
      name: name.trim(), category, sku: sku.trim(), quantity: Number(quantity) || 0,
      unit, reorderLevel: Number(reorderLevel) || 0, supplier: supplier.trim(), unitCost: Number(unitCost) || 0,
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
          <IconBtn onClick={onClose}>✕</IconBtn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={label}>Item name</label>
            <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 540W Monocrystalline Module" autoFocus /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><label style={label}>Category</label>
              <select style={field} value={category} onChange={(e) => setCategory(e.target.value)}>
                {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div style={{ flex: 1 }}><label style={label}>SKU</label>
              <input style={field} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. MOD-540-MC" /></div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><label style={label}>Quantity</label>
              <input style={field} type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" /></div>
            <div style={{ flex: 1 }}><label style={label}>Unit</label>
              <select style={field} value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select></div>
            <div style={{ flex: 1 }}><label style={label}>Reorder at</label>
              <input style={field} type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} placeholder="0" /></div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><label style={label}>Supplier</label>
              <input style={field} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. SunTech Philippines" /></div>
            <div style={{ flex: 1 }}><label style={label}>Unit cost (₱)</label>
              <input style={field} type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="0.00" /></div>
          </div>
          <button onClick={submit} style={{ ...display, fontWeight: 600, fontSize: 14, background: T.amber, color: T.bg, border: "none", borderRadius: 7, padding: "10px 14px", cursor: "pointer", marginTop: 6 }}>
            Add item
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, tone }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 130 }}>
      <div style={{ ...mono, fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color: tone || T.textDim, marginBottom: 8 }}>{label}</div>
      <div style={{ ...display, fontSize: 26, color: T.text, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ ...mono, fontSize: 10.5, color: T.textFaint, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("projects");

  const [projects, setProjects] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);

  const [inventory, setInventory] = useState(null);
  const [invQuery, setInvQuery] = useState("");
  const [invCategoryFilter, setInvCategoryFilter] = useState("All");
  const [showAddInv, setShowAddInv] = useState(false);

  const refresh = async () => {
    try {
      const data = await api("GET", "/projects");
      setProjects(data);
      setError(null);
    } catch (e) {
      setError("Can't reach the server. Check your Turso environment variables in Vercel.");
    } finally {
      setLoading(false);
    }
  };
  const refreshInventory = async () => {
    try {
      const data = await api("GET", "/inventory");
      setInventory(data);
    } catch (e) {
      // surfaced via the same error banner as projects
    }
  };

  useEffect(() => { refresh(); refreshInventory(); }, []);

  const createProject = async (p) => { await api("POST", "/projects", p); refresh(); };
  const createInvItem = async (item) => { await api("POST", "/inventory", item); refreshInventory(); };

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects
      .filter((p) => {
        const matchQ = !query || p.name.toLowerCase().includes(query.toLowerCase()) || (p.location || "").toLowerCase().includes(query.toLowerCase());
        const matchP = phaseFilter === "All" || p.phase === phaseFilter;
        return matchQ && matchP;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, query, phaseFilter]);

  const stats = useMemo(() => {
    if (!projects) return null;
    const totalKw = projects.reduce((s, p) => s + (p.capacityKw || 0), 0);
    const allMaint = projects.flatMap((p) => p.maintenance);
    const overdue = allMaint.filter((m) => m.status !== "Done" && daysUntil(m.dueDate) < 0).length;
    const upcoming = allMaint.filter((m) => m.status !== "Done" && daysUntil(m.dueDate) >= 0 && daysUntil(m.dueDate) <= 7).length;
    const operational = projects.filter((p) => p.phase === "Operational").length;
    return { totalKw, overdue, upcoming, operational, count: projects.length };
  }, [projects]);

  const filteredInv = useMemo(() => {
    if (!inventory) return [];
    return inventory
      .filter((i) => {
        const matchQ = !invQuery || i.name.toLowerCase().includes(invQuery.toLowerCase()) || (i.sku || "").toLowerCase().includes(invQuery.toLowerCase());
        const matchC = invCategoryFilter === "All" || i.category === invCategoryFilter;
        return matchQ && matchC;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, invQuery, invCategoryFilter]);

  const invStats = useMemo(() => {
    if (!inventory) return null;
    const totalUnits = inventory.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalValue = inventory.reduce((s, i) => s + (i.quantity || 0) * (i.unitCost || 0), 0);
    const lowStock = inventory.filter((i) => i.quantity <= i.reorderLevel).length;
    return { skus: inventory.length, totalUnits, totalValue, lowStock };
  }, [inventory]);

  return (
    <div style={{ background: T.bg, minHeight: "100vh", padding: "22px 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ ...display, fontSize: 19, color: T.text, margin: 0, fontWeight: 700 }}>☀ Solar Portfolio Tracker</h1>
          <div style={{ ...mono, fontSize: 10.5, color: T.textFaint }}>Procurement · Installation · Maintenance · Inventory — shared, backed by Turso</div>
        </div>
        <button onClick={() => (activeTab === "projects" ? setShowAdd(true) : setShowAddInv(true))}
          style={{ ...display, fontWeight: 600, fontSize: 13, background: T.amber, color: T.bg, border: "none", borderRadius: 7, padding: "9px 14px", cursor: "pointer" }}>
          + {activeTab === "projects" ? "New project" : "New item"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 18, background: T.panelAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: 3, width: "fit-content" }}>
        {[{ id: "projects", label: "Projects" }, { id: "inventory", label: "Inventory" }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              ...display, fontSize: 12.5, fontWeight: 600, padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer",
              background: activeTab === tab.id ? T.amber : "transparent", color: activeTab === tab.id ? T.bg : T.textDim,
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div style={{ ...mono, fontSize: 12, color: T.red, background: T.redDim, border: `1px solid ${T.red}`, borderRadius: 8, padding: 12, marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ ...mono, fontSize: 12, color: T.textDim, padding: 30 }}>Loading portfolio…</div>
      ) : activeTab === "projects" ? (
        projects && (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <StatCard label="Portfolio" value={stats.count} sub={`${stats.totalKw.toLocaleString()} kW total`} />
              <StatCard label="Operational" value={stats.operational} sub="sites generating" tone={T.green} />
              <StatCard label="Due this week" value={stats.upcoming} sub="maintenance tasks" tone={T.blue} />
              <StatCard label="Overdue" value={stats.overdue} sub="needs attention" tone={stats.overdue > 0 ? T.red : T.textDim} />
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 11px", flex: "1 1 220px" }}>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects or location…"
                  style={{ ...mono, fontSize: 12.5, background: "transparent", border: "none", color: T.text, width: "100%", outline: "none" }} />
              </div>
              <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}
                style={{ ...mono, fontSize: 12, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px", color: T.text }}>
                <option value="All">All phases</option>
                {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.length === 0 && <div style={{ ...mono, fontSize: 12, color: T.textFaint, padding: "24px 0", textAlign: "center" }}>No projects match.</div>}
              {filtered.map((p) => (
                <ProjectRow key={p.id} project={p} isOpen={expanded === p.id} onToggle={() => setExpanded(expanded === p.id ? null : p.id)} refresh={refresh} />
              ))}
            </div>
          </>
        )
      ) : (
        inventory && (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <StatCard label="SKUs tracked" value={invStats.skus} sub={`${invStats.totalUnits.toLocaleString()} units total`} />
              <StatCard label="Low stock" value={invStats.lowStock} sub="at or below reorder level" tone={invStats.lowStock > 0 ? T.red : T.textDim} />
              <StatCard label="Stock value" value={`₱${invStats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="at current unit cost" tone={T.green} />
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 11px", flex: "1 1 220px" }}>
                <input value={invQuery} onChange={(e) => setInvQuery(e.target.value)} placeholder="Search items or SKU…"
                  style={{ ...mono, fontSize: 12.5, background: "transparent", border: "none", color: T.text, width: "100%", outline: "none" }} />
              </div>
              <select value={invCategoryFilter} onChange={(e) => setInvCategoryFilter(e.target.value)}
                style={{ ...mono, fontSize: 12, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px", color: T.text }}>
                <option value="All">All categories</option>
                {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => downloadInventoryCsv(inventory)} title="Download a CSV backup of your inventory"
                style={{ ...mono, fontSize: 12, fontWeight: 600, background: T.panel, color: T.textDim, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 12px", cursor: "pointer" }}>
                ⬇ Backup CSV
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredInv.length === 0 && <div style={{ ...mono, fontSize: 12, color: T.textFaint, padding: "24px 0", textAlign: "center" }}>No items match.</div>}
              {filteredInv.map((item) => (
                <InventoryCard key={item.id} item={item} refresh={refreshInventory} />
              ))}
            </div>
          </>
        )
      )}

      {showAdd && <AddProjectModal onClose={() => setShowAdd(false)} onCreate={createProject} />}
      {showAddInv && <AddInventoryModal onClose={() => setShowAddInv(false)} onCreate={createInvItem} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
