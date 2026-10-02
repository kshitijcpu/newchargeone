import React, { useEffect, useState } from 'react';
import { Building2, PlugZap, Activity, IndianRupee, AlertTriangle, Zap, Wrench, Tags, Settings as SetIcon, CheckCircle2, Siren, Clock, UserCheck } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { PageHead, StatCard, StatusBadge, SkeletonRows, EmptyState, Modal, HealthRing } from '../../components/ui';
import MapView from '../../components/MapView';
import { api, fmtINR, timeAgo, fmtDateTime, meta } from '../../lib/api';
import { useApp } from '../../context/AppContext';

const chartTip = { contentStyle: { background: '#111827', border: '1px solid #1E293B', borderRadius: 12, fontSize: 12, color: '#F8FAFC' } };
const Card = ({ title, children, className = '' }) => (
  <div className={`card p-5 ${className}`}><div className="font-bold text-sm mb-4">{title}</div>{children}</div>
);

function useOverview() {
  const [d, setD] = useState(null);
  const { socket } = useApp();
  const load = () => api('/operator/overview').then(setD).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    const h = () => load();
    s.on('charger:update', h); s.on('session:started', h);
    return () => { s.off('charger:update', h); s.off('session:started', h); };
  }, [socket]);
  return d;
}

/* ---------- DASHBOARD ---------- */
export function OpDashboard() {
  const d = useOverview();
  if (!d) return <SkeletonRows n={5} />;
  return (
    <div className="space-y-5">
      <PageHead title="Operator dashboard" sub="Tata Power EZ Charge — live network overview" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard icon={Building2} label="Stations" value={d.stations} />
        <StatCard icon={PlugZap} label="Chargers" value={d.chargers} />
        <StatCard icon={Zap} label="Online" value={d.online} tone="primary" />
        <StatCard icon={Activity} label="Charging" value={d.charging} />
        <StatCard icon={AlertTriangle} label="Fault" value={d.fault} tone={d.fault > 0 ? 'danger' : 'default'} />
        <StatCard icon={Activity} label="Sessions today" value={d.sessionsToday.toLocaleString('en-IN')} />
        <StatCard icon={IndianRupee} label="Revenue today" value={fmtINR(d.revenueToday, 0)} tone="primary" />
        <StatCard icon={Zap} label="Energy" value={`${d.energyToday.toLocaleString('en-IN')} kWh`} />
      </div>

      {d.liveSessions.length > 0 && (
        <div className="card p-5 border-cyan-400/30">
          <div className="font-bold text-sm mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulseDot" /> Live sessions on your network</div>
          <div className="grid md:grid-cols-2 gap-3">
            {d.liveSessions.map(s => (
              <div key={s.id} className="rounded-xl bg-card2/60 border border-line p-3 flex items-center gap-3">
                <div className="text-xl font-black text-cyan-300 tabular-nums">{Math.round(s.pct)}%</div>
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-bold text-sm truncate">{s.stationName} · {s.chargerCode}</div>
                  <div className="text-sub">{s.powerNow} kW · {s.energyKwh} kWh · {fmtINR(s.estimatedCost)}</div>
                </div>
                <StatusBadge status="CHARGING" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Sessions per day (14d)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={d.days}>
              <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A3E635" stopOpacity={0.35} /><stop offset="100%" stopColor="#A3E635" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#1E293B" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
              <Tooltip {...chartTip} />
              <Area type="monotone" dataKey="sessions" stroke="#A3E635" strokeWidth={2} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Energy delivered (kWh)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.days}>
              <CartesianGrid stroke="#1E293B" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={38} />
              <Tooltip {...chartTip} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
              <Bar dataKey="energy" fill="#22D3EE" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Charger utilization (%)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={d.days}>
              <CartesianGrid stroke="#1E293B" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip {...chartTip} />
              <Line type="monotone" dataKey="utilization" stroke="#F59E0B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Fault rate (%)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={d.days}>
              <CartesianGrid stroke="#1E293B" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip {...chartTip} />
              <Line type="monotone" dataKey="faultRate" stroke="#EF4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

/* ---------- STATIONS ---------- */
export function OpStations() {
  const [stations, setStations] = useState(null);
  useEffect(() => { api('/operator/stations').then(d => setStations(d.stations)).catch(() => setStations([])); }, []);
  return (
    <div className="space-y-4">
      <PageHead title="My stations" sub="All stations operated under your network" />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          {!stations ? <SkeletonRows n={4} /> : stations.map(s => (
            <div key={s.id} className="card p-4 flex items-center gap-4">
              <HealthRing score={s.health} size={50} stroke={5} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{s.name}</div>
                <div className="text-xs text-sub">{s.city} · {s.counts.total} chargers · ₹{s.pricePerKwh}/kWh</div>
                <div className="flex gap-2 text-[11px] font-bold mt-1">
                  <span className="text-primary">{s.counts.available} free</span>
                  <span className="text-warn">{s.counts.occupied} busy</span>
                  {s.counts.fault > 0 && <span className="text-danger">{s.counts.fault} fault</span>}
                </div>
              </div>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </div>
        <div className="h-[420px] lg:h-auto min-h-[420px]"><MapView stations={stations || []} fit={!!stations?.length} /></div>
      </div>
    </div>
  );
}

/* ---------- CHARGERS ---------- */
export function OpChargers() {
  const [chargers, setChargers] = useState(null);
  const [edit, setEdit] = useState(null);
  const [price, setPrice] = useState(12);
  const { toast, socket } = useApp();
  const load = () => api('/operator/chargers').then(d => setChargers(d.chargers)).catch(() => setChargers([]));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    s.on('charger:update', load);
    return () => s.off('charger:update', load);
  }, [socket]);

  const setStatus = async (c, status) => {
    await api(`/operator/chargers/${c.id}`, { method: 'POST', body: { status } });
    toast(`${c.code} set to ${meta(status).label}`); load();
  };
  const savePrice = async () => {
    await api(`/operator/chargers/${edit.id}`, { method: 'POST', body: { pricePerKwh: price } });
    toast(`Tariff updated to ₹${price}/kWh`); setEdit(null); load();
  };

  return (
    <div>
      <PageHead title="Charger management" sub="Live status, health and controls for every charge point" />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead><tr className="text-left text-xs uppercase tracking-wider text-sub border-b border-line">
            {['Station', 'Charger', 'Connector', 'Power', 'Status', 'Health', 'Tariff', 'Last active', 'Actions'].map(h => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}
          </tr></thead>
          <tbody>
            {!chargers ? <tr><td colSpan="9" className="p-6"><SkeletonRows n={4} h="h-8" /></td></tr> :
              chargers.map(c => (
                <tr key={c.id} className="border-b border-line/60 hover:bg-card2/40 transition">
                  <td className="px-4 py-3 font-semibold">{c.stationName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                  <td className="px-4 py-3 text-sub">{c.connector}</td>
                  <td className="px-4 py-3">{c.powerKw} kW</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3"><span className={`font-bold ${c.health >= 80 ? 'text-primary' : c.health >= 55 ? 'text-warn' : 'text-danger'}`}>{c.health}</span></td>
                  <td className="px-4 py-3">₹{c.pricePerKwh}</td>
                  <td className="px-4 py-3 text-xs text-sub">{c.lastActiveMin} min ago</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {c.status !== 'MAINTENANCE'
                        ? <button className="btn-ghost !py-1 !px-2 !text-[11px]" onClick={() => setStatus(c, 'MAINTENANCE')} title="Set maintenance"><Wrench className="w-3 h-3" /> Maint.</button>
                        : <button className="btn-ghost !py-1 !px-2 !text-[11px] !text-primary" onClick={() => setStatus(c, 'AVAILABLE')}><CheckCircle2 className="w-3 h-3" /> Restore</button>}
                      <button className="btn-ghost !py-1 !px-2 !text-[11px]" onClick={() => { setEdit(c); setPrice(c.pricePerKwh); }}><Tags className="w-3 h-3" /> Price</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Update tariff — ${edit?.code}`}>
        <label className="label">Price per kWh — ₹{price}</label>
        <input type="range" min="8" max="25" value={price} onChange={e => setPrice(+e.target.value)} className="w-full accent-[#A3E635] mb-4" />
        <button className="btn-primary w-full" onClick={savePrice}>Save Tariff</button>
      </Modal>
    </div>
  );
}

/* ---------- SESSIONS ---------- */
export function OpSessions() {
  const [sessions, setSessions] = useState(null);
  const { socket } = useApp();
  const load = () => api('/operator/sessions').then(d => setSessions(d.sessions)).catch(() => setSessions([]));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    const h = () => load();
    s.on('session:update', h); s.on('session:started', h);
    return () => { s.off('session:update', h); s.off('session:started', h); };
  }, [socket]);
  return (
    <div>
      <PageHead title="Charging sessions" sub="Live and historical sessions across your stations" />
      {!sessions ? <SkeletonRows n={5} /> : sessions.length === 0 ? <EmptyState icon={Activity} title="No sessions yet" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-sub border-b border-line">
              {['Session', 'User', 'Station', 'Charger', 'Energy', 'Amount', 'Status', 'Started'].map(h => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}
            </tr></thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="border-b border-line/60 hover:bg-card2/40">
                  <td className="px-4 py-3 font-mono text-xs text-primary">{s.id}</td>
                  <td className="px-4 py-3">{s.userName}</td>
                  <td className="px-4 py-3 font-semibold">{s.stationName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.chargerCode}</td>
                  <td className="px-4 py-3 tabular-nums">{s.live ? <span className="text-cyan-300 font-bold">{s.energyKwh} kWh ⚡</span> : `${(s.energyKwh || 0).toFixed(1)} kWh`}</td>
                  <td className="px-4 py-3 font-semibold">{s.live ? fmtINR(s.estimatedCost) : fmtINR(s.finalAmount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.live ? 'CHARGING' : s.status} /></td>
                  <td className="px-4 py-3 text-xs text-sub">{timeAgo(s.startTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- REVENUE ---------- */
export function OpRevenue() {
  const d = useOverview();
  if (!d) return <SkeletonRows n={4} />;
  return (
    <div className="space-y-5">
      <PageHead title="Revenue" sub="Settlement figures net of payment provider fees (demo data)" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={IndianRupee} label="Today" value={fmtINR(42840, 0)} tone="primary" />
        <StatCard icon={IndianRupee} label="This week" value={fmtINR(284200, 0)} />
        <StatCard icon={IndianRupee} label="This month" value="₹11,28,420" />
        <StatCard icon={Zap} label="Energy" value="9,428 kWh" />
        <StatCard icon={Activity} label="Avg session" value={fmtINR(312, 0)} />
      </div>
      <Card title="Revenue per day (₹)">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={d.days}>
            <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A3E635" stopOpacity={0.4} /><stop offset="100%" stopColor="#A3E635" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="#1E293B" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip {...chartTip} />
            <Area type="monotone" dataKey="revenue" stroke="#A3E635" strokeWidth={2.5} fill="url(#g2)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Sessions vs energy">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={d.days}>
            <CartesianGrid stroke="#1E293B" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={38} />
            <Tooltip {...chartTip} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
            <Bar dataKey="sessions" fill="#A3E635" radius={[5, 5, 0, 0]} />
            <Bar dataKey="energy" fill="#22D3EE" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ---------- FAULTS ---------- */
export function OpFaults() {
  const [data, setData] = useState(null);
  const { socket } = useApp();
  const load = () => api('/operator/faults').then(setData).catch(() => setData({ reports: [], chargers: [] }));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    s.on('charger:update', load);
    return () => s.off('charger:update', load);
  }, [socket]);
  if (!data) return <SkeletonRows n={4} />;
  return (
    <div className="space-y-5">
      <PageHead title="Faults & reports" sub="Telemetry faults and user-filed reports across your network" />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={`Faulted / maintenance chargers (${data.chargers.length})`}>
          {data.chargers.length === 0 ? <div className="text-sm text-sub text-center py-6">No faulted chargers. 🎉</div> : (
            <div className="space-y-2">
              {data.chargers.map(c => (
                <div key={c.id} className="rounded-xl bg-danger/5 border border-danger/25 p-3 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{c.stationName} · <span className="font-mono">{c.code}</span></div>
                    <div className="text-xs text-sub">{c.faultCode || 'Under maintenance'} · health {c.health}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title={`User fault reports (${data.reports.length})`}>
          {data.reports.length === 0 ? <div className="text-sm text-sub text-center py-6">No user reports.</div> : (
            <div className="space-y-2">
              {data.reports.map(r => (
                <div key={r.id} className="rounded-xl bg-card2/60 border border-line p-3">
                  <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-xs font-bold text-primary">{r.id}</span><StatusBadge status={r.status} /></div>
                  <div className="font-semibold text-sm mt-1">{r.issue}</div>
                  <div className="text-xs text-sub">{r.stationName} · {r.chargerCode} · by {r.userName} · {timeAgo(r.createdAt)}</div>
                  {r.description && <div className="text-xs text-sub mt-1 italic">"{r.description}"</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------- PRICING ---------- */
export function OpPricing() {
  const [chargers, setChargers] = useState(null);
  useEffect(() => { api('/operator/chargers').then(d => setChargers(d.chargers)).catch(() => setChargers([])); }, []);
  const byStation = {};
  (chargers || []).forEach(c => { (byStation[c.stationName] = byStation[c.stationName] || []).push(c); });
  return (
    <div>
      <PageHead title="Pricing" sub="Tariffs per station — edit individual chargers in Charger Management" />
      {!chargers ? <SkeletonRows n={4} /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(byStation).map(([name, chs]) => (
            <div key={name} className="card p-5">
              <div className="font-bold text-sm mb-1">{name}</div>
              <div className="text-3xl font-black text-primary">₹{chs[0].pricePerKwh}<span className="text-sm text-sub font-medium">/kWh</span></div>
              <div className="text-xs text-sub mt-1">{chs.length} chargers · {[...new Set(chs.map(c => c.connector))].join(', ')}</div>
              <div className="mt-3 pt-3 border-t border-line text-xs text-sub">Peak hours (18:00–22:00): +₹1/kWh · Idle fee ₹2/min after 10 min</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- SETTINGS ---------- */
export function OpSettings() {
  const { toast } = useApp();
  const [s, setS] = useState({ faultAlerts: true, dailyDigest: true, autoMaintenance: true, publicHealth: true });
  const Toggle = ({ k, label, sub }) => (
    <button onClick={() => { setS(x => ({ ...x, [k]: !x[k] })); toast('Setting saved'); }} className="w-full flex items-center justify-between py-3.5 border-b border-line last:border-0 text-left">
      <div><div className="font-semibold text-sm">{label}</div><div className="text-xs text-sub mt-0.5">{sub}</div></div>
      <div className={`w-11 h-6 rounded-full p-0.5 transition ${s[k] ? 'bg-primary' : 'bg-card2 border border-line'}`}>
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${s[k] ? 'translate-x-5' : ''}`} />
      </div>
    </button>
  );
  return (
    <div className="max-w-2xl">
      <PageHead title="Settings" sub="Network preferences for Tata Power EZ Charge" />
      <div className="card p-5">
        <Toggle k="faultAlerts" label="Instant fault alerts" sub="Notify the ops team the moment telemetry or a user reports a fault" />
        <Toggle k="dailyDigest" label="Daily performance digest" sub="Utilization, revenue and health summary at 08:00 IST" />
        <Toggle k="autoMaintenance" label="Auto-maintenance flagging" sub="Automatically mark chargers under verification after repeated failures" />
        <Toggle k="publicHealth" label="Show health scores publicly" sub="Display ChargeOne reliability scores on your station listings" />
      </div>
      <div className="card p-5 mt-4">
        <div className="font-bold text-sm mb-3">Integration</div>
        {[['OCPP endpoint', 'wss://ocpp.chargeone.demo/tpez'], ['OCPI token', 'ocpi_tpez_????????????'], ['Webhook URL', 'https://api.tatapower.demo/chargeone/events']].map(([k, v]) => (
          <div key={k} className="flex justify-between py-2.5 border-b border-line last:border-0 text-sm"><span className="text-sub">{k}</span><span className="font-mono text-xs">{v}</span></div>
        ))}
      </div>
    </div>
  );
}


/* ---------- INCIDENTS (SLA-driven incident management) ---------- */
export function OpIncidents() {
  const [incidents, setIncidents] = useState(null);
  const [sel, setSel] = useState(null);
  const { toast, socket } = useApp();
  const load = () => api('/operator/incidents').then(d => setIncidents(d.incidents)).catch(() => setIncidents([]));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    s.on('incident:update', load);
    return () => s.off('incident:update', load);
  }, [socket]);

  const act = async (inc, action) => {
    const d = await api(`/operator/incidents/${inc.id}/action`, { method: 'POST', body: { action } });
    toast(`${inc.id}: ${action}`); load(); setSel(d.incident);
  };
  const slaLeft = (inc) => {
    if (inc.status === 'RESOLVED') return { label: 'Met', ok: true };
    const mins = inc.slaMins - Math.floor((Date.now() - new Date(inc.createdAt).getTime()) / 60000);
    return mins > 0 ? { label: `${Math.floor(mins / 60)}h ${mins % 60}m left`, ok: mins > 60 } : { label: `Breached ${Math.abs(Math.floor(mins / 60))}h ago`, ok: false, breached: true };
  };
  const sevCls = { P1: 'text-danger bg-danger/10 border-danger/30', P2: 'text-warn bg-warn/10 border-warn/30', P3: 'text-sub bg-slate-500/10 border-slate-500/30' };
  const open = incidents?.filter(i => i.status !== 'RESOLVED') || [];

  return (
    <div>
      <PageHead title="Incident management" sub="Auto-created from telemetry faults & user reports · SLA-tracked · linked to charger state" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[[open.length, 'Open incidents', open.length ? 'text-danger' : 'text-primary'],
          [open.filter(i => i.severity === 'P1').length, 'P1 critical', 'text-danger'],
          [(incidents || []).filter(i => i.status === 'RESOLVED').length, 'Resolved', 'text-primary']].map(([v, l, c]) => (
          <div key={l} className="card p-4 text-center"><div className={`text-2xl font-black ${c}`}>{v}</div><div className="text-[10px] md:text-xs text-sub uppercase font-semibold tracking-wider mt-0.5">{l}</div></div>
        ))}
      </div>
      {!incidents ? <SkeletonRows n={3} /> : incidents.length === 0 ? <EmptyState icon={Siren} title="No incidents" sub="Telemetry faults and user reports create incidents automatically." /> : (
        <div className="space-y-3">
          {incidents.map(inc => {
            const sla = slaLeft(inc);
            return (
              <button key={inc.id} onClick={() => setSel(inc)} className="card card-hover p-4 w-full text-left flex flex-wrap items-center gap-3">
                <span className={`chip font-black ${sevCls[inc.severity]}`}>{inc.severity}</span>
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">{inc.id}</span>
                    <StatusBadge status={inc.status === 'OPEN' ? 'FAULT' : inc.status === 'RESOLVED' ? 'RESOLVED' : 'UNDER_VERIFICATION'} />
                    <span className="text-xs text-sub">{inc.status}</span>
                  </div>
                  <div className="font-bold text-sm mt-0.5">{inc.title}</div>
                  <div className="text-xs text-sub">{inc.stationName} · {inc.chargerCode} · source: {inc.source}{inc.assignee ? ` · ${inc.assignee}` : ''}</div>
                </div>
                <div className={`text-xs font-bold flex items-center gap-1.5 ${sla.breached ? 'text-danger' : sla.ok ? 'text-primary' : 'text-warn'}`}>
                  <Clock className="w-3.5 h-3.5" /> SLA: {sla.label}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.id} — ${sel.severity}` : ''} wide>
        {sel && (
          <div>
            <div className="font-bold">{sel.title}</div>
            <div className="text-sm text-sub mb-4">{sel.stationName} · {sel.chargerCode} · created {fmtDateTime(sel.createdAt)}{sel.linkedReportId ? ` · report ${sel.linkedReportId}` : ''}</div>
            <div className="label">Action timeline</div>
            <div className="space-y-2 mb-5">
              {sel.timeline.map((t, i) => (
                <div key={i} className="rounded-xl bg-card2/60 border border-line p-2.5 text-xs">
                  <span className="text-primary font-bold">{fmtDateTime(t.at)}</span> · <span className="text-sub">{t.actor}</span>
                  <div className="text-ink mt-0.5">{t.action}</div>
                </div>
              ))}
            </div>
            {sel.status !== 'RESOLVED' && (
              <div className="grid grid-cols-2 gap-2">
                {sel.status === 'OPEN' && <button className="btn-ghost" onClick={() => act(sel, 'acknowledge')}><UserCheck className="w-4 h-4" /> Acknowledge</button>}
                {sel.status !== 'INVESTIGATING' && <button className="btn-ghost" onClick={() => act(sel, 'investigate')}><Activity className="w-4 h-4" /> Investigate</button>}
                <button className="btn-ghost !text-warn" onClick={() => act(sel, 'maintenance')}><Wrench className="w-4 h-4" /> Set Maintenance</button>
                <button className="btn-primary" onClick={() => act(sel, 'resolve')}><CheckCircle2 className="w-4 h-4" /> Resolve & Restore</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
