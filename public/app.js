const { useState, useEffect, useMemo, Fragment } = React;

const PHASES = ["Planning", "Procurement", "Installation", "Commissioning", "Operational"];
const PHASE_SHORT = { Planning: "PLAN", Procurement: "PROC", Installation: "INST", Commissioning: "COMM", Operational: "OPS" };

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

function PhaseRail({ phase }) {
  const idx = phaseIndex(phase);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 220 }}>
      {PHASES.map((p, i) => {
        const state = i < idx ? "done" : i === idx ? "current" : "future";
        return (
          <Fragment key={p}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 12, height: 12, borderRadius: 999,
                background: state === "done" ? T.amberDim : state === "current" ? T.amber : "transparent",
                border: `1.5px solid ${state === "future" ? T.borderLight : T.amber}`,
                boxShadow: state === "current" ? `0 0 0 3px ${T.amber}33` : "none",
              }} />
              <span style={{ ...mono, fontSize: 8, letterSpacing: "0.05em", color: state === "future" ? T.textFaint : T.textDim }}>
                {PHASE_SHORT[p]}
              </span>
            </div>
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

function AddProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [capacityKw, setCapacityKw] = useState("");
  const [phase, setPhase] = useState("Planning");
  const [ptoDate, setPtoDate] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    await onCreate({ name: name.trim(), location: location.trim(), capacityKw: Number(capacityKw) || 0, phase, ptoDate: ptoDate || null });
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
          <button onClick={submit} style={{ ...display, fontWeight: 600, fontSize: 14, background: T.amber, color: T.bg, border: "none", borderRadius: 7, padding: "10px 14px", cursor: "pointer", marginTop: 6 }}>
            Create project
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
  const [projects, setProjects] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);

  const refresh = async () => {
    try {
      const data = await api("GET", "/projects");
      setProjects(data);
      setError(null);
    } catch (e) {
      setError("Can't reach the server. Is it running? (npm start)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const createProject = async (p) => { await api("POST", "/projects", p); refresh(); };
  const deleteProject = async (id) => { await api("DELETE", `/projects/${id}`); refresh(); };

  const filtered = useMemo(() => {
    if (!projects) return [];
    return projects.filter((p) => {
      const matchQ = !query || p.name.toLowerCase().includes(query.toLowerCase()) || (p.location || "").toLowerCase().includes(query.toLowerCase());
      const matchP = phaseFilter === "All" || p.phase === phaseFilter;
      return matchQ && matchP;
    });
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

  return (
    <div style={{ background: T.bg, minHeight: "100vh", padding: "22px 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ ...display, fontSize: 19, color: T.text, margin: 0, fontWeight: 700 }}>☀ Solar Portfolio Tracker</h1>
          <div style={{ ...mono, fontSize: 10.5, color: T.textFaint }}>Procurement · Installation · Maintenance — backed by SQLite</div>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ ...display, fontWeight: 600, fontSize: 13, background: T.amber, color: T.bg, border: "none", borderRadius: 7, padding: "9px 14px", cursor: "pointer" }}>
          + New project
        </button>
      </div>

      {error && <div style={{ ...mono, fontSize: 12, color: T.red, background: T.redDim, border: `1px solid ${T.red}`, borderRadius: 8, padding: 12, marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ ...mono, fontSize: 12, color: T.textDim, padding: 30 }}>Loading portfolio…</div>
      ) : projects && (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
            <StatCard label="Portfolio" value={stats.count} sub={`${(stats.totalKw / 1000).toFixed(2)} MW total`} />
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
            {filtered.map((p) => {
              const isOpen = expanded === p.id;
              const overdueCount = p.maintenance.filter((m) => m.status !== "Done" && daysUntil(m.dueDate) < 0).length;
              return (
                <div key={p.id} style={{ background: T.panel, border: `1px solid ${isOpen ? T.borderLight : T.border}`, borderRadius: 10, overflow: "hidden" }}>
                  <div onClick={() => setExpanded(isOpen ? null : p.id)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 16px", cursor: "pointer", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 200px", minWidth: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ ...display, fontSize: 14.5, color: T.text, fontWeight: 600 }}>{p.name}</span>
                        {overdueCount > 0 && <Badge tone="red">{overdueCount} overdue</Badge>}
                      </div>
                      <div style={{ ...mono, fontSize: 11, color: T.textFaint, marginTop: 3 }}>
                        {p.location || "—"} · {(p.capacityKw / 1000).toFixed(2)} MW
                      </div>
                    </div>
                    <PhaseRail phase={p.phase} />
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ ...mono, fontSize: 10, color: T.textFaint }}>Target PTO</div>
                        <div style={{ ...mono, fontSize: 11.5, color: T.textDim }}>{fmtDate(p.ptoDate)}</div>
                      </div>
                      <IconBtn danger title="Delete project" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}>🗑</IconBtn>
                      <span style={{ color: T.textDim, transform: isOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform .2s" }}>▾</span>
                    </div>
                  </div>
                  {isOpen && <ProjectDetail project={p} refresh={refresh} />}
                </div>
              );
            })}
          </div>
        </>
      )}

      {showAdd && <AddProjectModal onClose={() => setShowAdd(false)} onCreate={createProject} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
