import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, Zap, Activity, AlertTriangle, IndianRupee, RotateCcw, Scale, Search, Ban, CheckCircle2, Eye, PlugZap, Wrench, ChevronRight, Play, ShieldCheck, Cable, Network, Landmark, Database, Download, FileClock, Send } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { PageHead, StatCard, StatusBadge, SkeletonRows, EmptyState, Modal, Timeline, Spinner } from '../../components/ui';
import MapView from '../../components/MapView';
import { api, fmtINR, fmtDate, fmtDateTime, timeAgo, meta } from '../../lib/api';
import { useApp } from '../../context/AppContext';

const chartTip = { contentStyle: { background: '#111827', border: '1px solid #1E293B', borderRadius: 12, fontSize: 12, color: '#F8FAFC' } };
const Card = ({ title, children, className = '' }) => <div className={`card p-5 ${className}`}><div className="font-bold text-sm mb-4">{title}</div>{children}</div>;

function useAdminOverview() {
  const [d, setD] = useState(null);
  const { socket } = useApp();
  const load = () => api('/admin/overview').then(setD).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    const h = () => load();
    s.on('session:started', h); s.on('charger:update', h); s.on('refund:update', h);
    return () => { s.off('session:started', h); s.off('charger:update', h); s.off('refund:update', h); };
  }, [socket]);
  return d;
}

/* ---------- DASHBOARD ---------- */
export function AdminDashboard() {
  const d = useAdminOverview();
  if (!d) return <SkeletonRows n={6} />;
  return (
    <div className="space-y-5">
      <PageHead title="ChargeOne control center" sub="Platform-wide network, payments and reliability at a glance" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Building2} label="Total stations" value={d.totalStations.toLocaleString('en-IN')} sub={`${d.demoStations} in live demo set`} />
        <StatCard icon={Zap} label="Online" value={d.online} tone="primary" />
        <StatCard icon={Activity} label="Charging" value={d.charging} />
        <StatCard icon={AlertTriangle} label="Fault" value={d.fault} tone="danger" />
        <StatCard icon={Wrench} label="Maintenance" value={d.maintenance} tone="warn" />
        <StatCard icon={Users} label="Users" value={d.users.toLocaleString('en-IN')} />
        <StatCard icon={Building2} label="Operators" value={d.operators} />
        <StatCard icon={Activity} label="Sessions today" value={d.sessionsToday.toLocaleString('en-IN')} />
        <StatCard icon={Zap} label="Energy today" value={`${d.energyTodayMwh} MWh`} />
        <StatCard icon={IndianRupee} label="Revenue today" value={d.revenueToday} tone="primary" />
        <StatCard icon={RotateCcw} label="Refund cases" value={d.refundCases} tone="warn" />
        <StatCard icon={Scale} label="Open disputes" value={d.openDisputes} tone="warn" />
      </div>

      {d.liveSessions.length > 0 && (
        <div className="card p-5 border-cyan-400/30">
          <div className="font-bold text-sm mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulseDot" /> Live sessions right now</div>
          <div className="grid md:grid-cols-3 gap-3">
            {d.liveSessions.map(s => (
              <div key={s.id} className="rounded-xl bg-card2/60 border border-line p-3 flex items-center gap-3">
                <div className="text-xl font-black text-cyan-300 tabular-nums">{Math.round(s.pct)}%</div>
                <div className="min-w-0 text-xs flex-1">
                  <div className="font-bold truncate">{s.stationName}</div>
                  <div className="text-sub">{s.chargerCode} · {s.powerNow} kW · {fmtINR(s.estimatedCost)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Sessions (14d)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={d.days}>
              <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A3E635" stopOpacity={0.35} /><stop offset="100%" stopColor="#A3E635" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="#1E293B" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
              <Tooltip {...chartTip} />
              <Area type="monotone" dataKey="sessions" stroke="#A3E635" strokeWidth={2.5} fill="url(#ga)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Network status mix">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={[{ name: 'Online', value: d.online }, { name: 'Charging', value: d.charging }, { name: 'Fault', value: d.fault }, { name: 'Maintenance', value: d.maintenance }]} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {['#A3E635', '#22D3EE', '#EF4444', '#F59E0B'].map(c => <Cell key={c} fill={c} stroke="transparent" />)}
              </Pie>
              <Tooltip {...chartTip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-sub -mt-3">
            {[['Online', '#A3E635'], ['Charging', '#22D3EE'], ['Fault', '#EF4444'], ['Maint.', '#F59E0B']].map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>)}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- LIVE MAP ---------- */
export function AdminMap() {
  const [stations, setStations] = useState(null);
  const [sel, setSel] = useState(null);
  const { socket } = useApp();
  const load = () => api('/stations').then(d => setStations(d.stations)).catch(() => setStations([]));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    s.on('charger:update', load);
    return () => s.off('charger:update', load);
  }, [socket]);
  return (
    <div>
      <PageHead title="Live network map" sub="All supported stations across India — click a marker to inspect" />
      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="h-[70vh]"><MapView stations={stations || []} center={[20.6, 77.5]} zoom={5} onSelect={setSel} selectedId={sel?.id} /></div>
        <div className="space-y-3">
          {sel ? (
            <div className="card p-5 animate-fadeUp">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold">{sel.name}</div>
                  <div className="text-xs text-sub">{sel.operatorName} · {sel.city}</div>
                </div>
                <StatusBadge status={sel.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-center text-sm">
                {[[`${sel.counts.total}`, 'Chargers'], [`${sel.health}/100`, 'Health'], [`${sel.counts.available}`, 'Available'], [`${sel.counts.fault}`, 'Faults'], [`₹${sel.pricePerKwh}`, 'Per kWh'], [`${(sel.counts.total * 8.4).toFixed(0)}k`, 'Revenue (₹/day)']].map(([a, b]) => (
                  <div key={b} className="rounded-xl bg-card2/60 border border-line py-2.5"><div className="font-extrabold">{a}</div><div className="text-[10px] text-sub uppercase font-semibold">{b}</div></div>
                ))}
              </div>
              <div className="mt-4 space-y-1.5">
                {sel.chargers.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs py-1.5 border-b border-line/50 last:border-0">
                    <span className="font-mono">{c.code}</span>
                    <span className="text-sub">{c.powerKw} kW</span>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={Eye} title="Select a station" sub="Click any marker to see chargers, health, sessions and faults." />
          )}
          <div className="card p-4 text-xs text-sub space-y-1.5">
            <div className="font-bold text-ink text-sm mb-1">Legend</div>
            {[['#A3E635', 'Working / available'], ['#F59E0B', 'Busy / maintenance'], ['#EF4444', 'Fault'], ['#64748B', 'Offline']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- USERS ---------- */
export function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const { toast } = useApp();
  const load = () => api(`/admin/users?q=${encodeURIComponent(q)}`).then(d => setUsers(d.users)).catch(() => setUsers([]));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]);
  const toggle = async (u) => { const r = await api(`/admin/users/${u.id}/toggle`, { method: 'POST' }); toast(`${u.name} is now ${r.user.status}`); load(); if (sel) setSel(null); };
  const inspect = async (u) => { const d = await api(`/admin/users/${u.id}`); setSel(d); };
  return (
    <div>
      <PageHead title="User management" sub={`${users?.length ?? '—'} accounts`} right={
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sub" /><input className="input !pl-9 w-56" placeholder="Search user…" value={q} onChange={e => setQ(e.target.value)} /></div>
      } />
      {!users ? <SkeletonRows n={5} /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-sub border-b border-line">
              {['User', 'Email', 'Role', 'City', 'Joined', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}
            </tr></thead>
            <tbody>{users.map(u => (
              <tr key={u.id} className="border-b border-line/60 hover:bg-card2/40">
                <td className="px-4 py-3"><div className="font-semibold">{u.name}</div><div className="text-[11px] text-sub font-mono">{u.id}</div></td>
                <td className="px-4 py-3 text-sub">{u.email}</td>
                <td className="px-4 py-3"><span className="chip text-sub bg-card2 border-line">{u.role}</span></td>
                <td className="px-4 py-3 text-sub">{u.city}</td>
                <td className="px-4 py-3 text-sub">{fmtDate(u.joined)}</td>
                <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-3"><div className="flex gap-1.5">
                  <button className="btn-ghost !py-1 !px-2 !text-[11px]" onClick={() => inspect(u)}><Eye className="w-3 h-3" /> View</button>
                  {u.role === 'USER' && <button className={`btn-ghost !py-1 !px-2 !text-[11px] ${u.status === 'ACTIVE' ? '!text-danger' : '!text-primary'}`} onClick={() => toggle(u)}>{u.status === 'ACTIVE' ? <><Ban className="w-3 h-3" /> Suspend</> : <><CheckCircle2 className="w-3 h-3" /> Restore</>}</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.user.name} wide>
        {sel && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[[sel.sessions.length, 'Sessions'], [sel.payments.length, 'Payments'], [sel.refunds.length, 'Refunds'], [sel.reports.length, 'Reports']].map(([a, b]) => (
                <div key={b} className="rounded-xl bg-card2/60 border border-line py-3"><div className="font-black text-lg text-primary">{a}</div><div className="text-[10px] text-sub uppercase font-semibold">{b}</div></div>
              ))}
            </div>
            <div>
              <div className="label">Recent payments</div>
              {sel.payments.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-line/60 last:border-0 text-sm">
                  <span className="font-mono text-xs text-primary">{p.id}</span>
                  <span>{fmtINR(p.amountFinal || p.amountAuthorized)}</span>
                  <StatusBadge status={p.status} />
                </div>
              ))}
              {sel.payments.length === 0 && <div className="text-sm text-sub py-3">No payments.</div>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------- OPERATORS ---------- */
export function AdminOperators() {
  const [ops, setOps] = useState(null);
  const { toast } = useApp();
  const load = () => api('/admin/operators').then(d => setOps(d.operators)).catch(() => setOps([]));
  useEffect(() => { load(); }, []);
  const toggle = async (o) => { const r = await api(`/admin/operators/${o.id}/toggle`, { method: 'POST' }); toast(`${o.name}: ${r.operator.status}`); load(); };
  return (
    <div>
      <PageHead title="Operator management" sub="Charge point operators on the ChargeOne platform" />
      {!ops ? <SkeletonRows n={4} /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-sub border-b border-line">
              {['Operator', 'Stations', 'Chargers', 'Sessions/day', 'Revenue/day', 'Fault rate', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}
            </tr></thead>
            <tbody>{ops.map(o => (
              <tr key={o.id} className="border-b border-line/60 hover:bg-card2/40">
                <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-bg text-sm" style={{ background: o.color }}>{o.name[0]}</div><div><div className="font-semibold">{o.name}</div><div className="text-[11px] text-sub">since {fmtDate(o.joined)}</div></div></div></td>
                <td className="px-4 py-3">{o.stationCount}</td>
                <td className="px-4 py-3">{o.chargerCount}</td>
                <td className="px-4 py-3">{o.sessions}</td>
                <td className="px-4 py-3 font-semibold">{fmtINR(o.revenue, 0)}</td>
                <td className="px-4 py-3"><span className={o.faultRate > 8 ? 'text-danger font-bold' : 'text-sub'}>{o.faultRate}%</span></td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3">
                  {o.status === 'PENDING'
                    ? <button className="btn-primary !py-1 !px-2.5 !text-[11px]" onClick={() => toggle(o)}><CheckCircle2 className="w-3 h-3" /> Approve</button>
                    : <button className={`btn-ghost !py-1 !px-2.5 !text-[11px] ${o.status === 'ACTIVE' ? '!text-danger' : '!text-primary'}`} onClick={() => toggle(o)}>{o.status === 'ACTIVE' ? 'Suspend' : 'Restore'}</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- PAYMENTS ---------- */
export function AdminPayments() {
  const [payments, setPayments] = useState(null);
  const [filter, setFilter] = useState('');
  const { socket } = useApp();
  const load = () => api(`/admin/payments${filter ? `?status=${filter}` : ''}`).then(d => setPayments(d.payments)).catch(() => setPayments([]));
  useEffect(() => { load(); }, [filter]);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    s.on('payment:update', load);
    return () => s.off('payment:update', load);
  }, [socket, filter]);
  return (
    <div>
      <PageHead title="Payment management" sub="All platform transactions with full state history" right={
        <div className="flex gap-2">{['', 'Success', 'Pending', 'Failed', 'Refunded'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`chip cursor-pointer ${filter === f ? 'text-bg bg-primary border-primary' : 'text-sub bg-card2 border-line'}`}>{f || 'All'}</button>
        ))}</div>
      } />
      {!payments ? <SkeletonRows n={6} /> : payments.length === 0 ? <EmptyState title="No transactions in this filter" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-sub border-b border-line">
              {['Transaction', 'User', 'Station', 'Amount', 'Status', 'Provider', 'Date'].map(h => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}
            </tr></thead>
            <tbody>{payments.map(p => (
              <tr key={p.id} className="border-b border-line/60 hover:bg-card2/40">
                <td className="px-4 py-3 font-mono text-xs text-primary">{p.id}</td>
                <td className="px-4 py-3">{p.userName}</td>
                <td className="px-4 py-3 text-sub">{p.stationName}</td>
                <td className="px-4 py-3 font-semibold">{fmtINR(p.amountFinal || p.amountAuthorized)}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-xs text-sub">{p.provider}</td>
                <td className="px-4 py-3 text-xs text-sub">{fmtDateTime(p.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- REFUNDS ---------- */
export function AdminRefunds() {
  const [refunds, setRefunds] = useState(null);
  const [sel, setSel] = useState(null);
  const { toast, socket } = useApp();
  const load = () => api('/admin/refunds').then(d => setRefunds(d.refunds)).catch(() => setRefunds([]));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    s.on('refund:update', load);
    return () => s.off('refund:update', load);
  }, [socket]);
  const advance = async (r) => {
    const d = await api(`/admin/refunds/${r.id}/advance`, { method: 'POST' });
    toast(d.refund.status === 'COMPLETED' ? `${r.id} completed & settled` : `${r.id} advanced one step`);
    load(); setSel(d.refund);
  };
  return (
    <div>
      <PageHead title="Refund management" sub="Inspect cases and advance provider workflows (subject to provider capabilities)" />
      {!refunds ? <SkeletonRows n={5} /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-sub border-b border-line">
              {['Refund', 'Transaction', 'User', 'Amount', 'Reason', 'Status', 'Created', 'Updated', ''].map(h => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}
            </tr></thead>
            <tbody>{refunds.map(r => (
              <tr key={r.id} className="border-b border-line/60 hover:bg-card2/40">
                <td className="px-4 py-3 font-mono text-xs text-primary">{r.id}</td>
                <td className="px-4 py-3 font-mono text-xs text-sub">{r.paymentId}</td>
                <td className="px-4 py-3">{r.userName}</td>
                <td className="px-4 py-3 font-semibold">{fmtINR(r.amount)}</td>
                <td className="px-4 py-3 text-xs text-sub max-w-[200px] truncate">{r.reason}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-xs text-sub">{fmtDate(r.createdAt)}</td>
                <td className="px-4 py-3 text-xs text-sub">{fmtDate(r.updatedAt)}</td>
                <td className="px-4 py-3"><button className="btn-ghost !py-1 !px-2 !text-[11px]" onClick={() => setSel(r)}><Eye className="w-3 h-3" /> Inspect</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Modal open={!!sel} onClose={() => setSel(null)} title={`Refund ${sel?.id}`}>
        {sel && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl font-black text-primary">{fmtINR(sel.amount)}</div>
              <StatusBadge status={sel.status} />
            </div>
            <Timeline steps={sel.timeline.map(t => ({ title: t.step, sub: t.at ? fmtDateTime(t.at) : 'Pending', done: t.done }))} />
            {sel.status === 'PROCESSING' && <button className="btn-primary w-full mt-4" onClick={() => advance(sel)}><Play className="w-4 h-4" /> Advance Workflow Step</button>}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------- DISPUTES ---------- */
export function AdminDisputes() {
  const [disputes, setDisputes] = useState(null);
  const [sel, setSel] = useState(null);
  const { toast } = useApp();
  const load = () => api('/admin/disputes').then(d => setDisputes(d.disputes)).catch(() => setDisputes([]));
  useEffect(() => { load(); }, []);
  const act = async (d, action) => {
    const r = await api(`/admin/disputes/${d.id}/action`, { method: 'POST', body: { action } });
    toast(action === 'resolve' ? `Dispute ${d.id} resolved — user notified` : `Operator response requested for ${d.id}`);
    load(); setSel(r.dispute);
  };
  return (
    <div>
      <PageHead title="Dispute management" sub="Cases where payment, session and operator evidence disagree" />
      {!disputes ? <SkeletonRows n={3} /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {disputes.map(d => (
            <button key={d.id} onClick={() => setSel(d)} className="card card-hover p-5 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-bold text-primary">#{d.id}</span>
                <StatusBadge status={d.status} />
              </div>
              <div className="font-bold">{d.issue}</div>
              <div className="text-sm text-sub mt-1">{d.userName} · {d.stationName} · {d.operatorName}</div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                <span className="text-lg font-black">{fmtINR(d.amount)}</span>
                <span className="text-xs text-sub">{timeAgo(d.createdAt)} <ChevronRight className="w-3.5 h-3.5 inline" /></span>
              </div>
            </button>
          ))}
        </div>
      )}
      <Modal open={!!sel} onClose={() => setSel(null)} title={`Dispute #${sel?.id}`} wide>
        {sel && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-2 text-sm mb-5">
                {[['User', sel.userName], ['Station', sel.stationName], ['Operator', sel.operatorName], ['Issue', sel.issue], ['Amount', fmtINR(sel.amount)], ['Linked payment', sel.paymentId || '—']].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 py-1.5 border-b border-line/60 last:border-0"><span className="text-sub">{k}</span><span className="font-semibold text-right">{v}</span></div>
                ))}
              </div>
              <div className="label">Evidence on file</div>
              <div className="space-y-1.5">
                {sel.evidence.map(e => <div key={e} className="flex items-center gap-2 text-sm"><ShieldCheck className="w-4 h-4 text-primary shrink-0" />{e}</div>)}
              </div>
            </div>
            <div>
              <div className="label">Resolution timeline</div>
              <Timeline steps={sel.timeline.map(t => ({ title: t.step, done: t.done }))} />
              {sel.status !== 'RESOLVED' && (
                <div className="grid grid-cols-1 gap-2 mt-4">
                  <button className="btn-ghost !text-warn" onClick={() => act(sel, 'request-operator')}><Send className="w-4 h-4" /> Request Operator Response</button>
                  <button className="btn-primary" onClick={() => act(sel, 'resolve')}><CheckCircle2 className="w-4 h-4" /> Resolve Dispute</button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------- ANALYTICS ---------- */
export function AdminAnalytics() {
  const d = useAdminOverview();
  if (!d) return <SkeletonRows n={6} />;
  const charts = [
    ['Charging sessions', 'sessions', '#A3E635', AreaChart, Area],
    ['Energy delivered (MWh)', 'energyMwh', '#22D3EE', BarChart, Bar],
    ['Revenue (₹ lakh)', 'revenueL', '#A3E635', AreaChart, Area],
    ['Avg session duration (min)', 'avgDuration', '#8B5CF6', LineChart, Line],
    ['Charger utilization (%)', 'utilization', '#F59E0B', LineChart, Line],
    ['Failure rate (%)', 'failureRate', '#EF4444', LineChart, Line],
    ['Refund rate (%)', 'refundRate', '#F59E0B', LineChart, Line],
    ['Network uptime (%)', 'uptime', '#A3E635', LineChart, Line],
  ];
  return (
    <div>
      <PageHead title="Platform analytics" sub="14-day operational metrics across the whole network" />
      <div className="grid md:grid-cols-2 gap-4">
        {charts.map(([title, key, color, ChartC, SeriesC]) => (
          <Card key={key} title={title}>
            <ResponsiveContainer width="100%" height={180}>
              <ChartC data={d.days}>
                {SeriesC === Area && <defs><linearGradient id={`g-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>}
                <CartesianGrid stroke="#1E293B" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} width={36} domain={key === 'uptime' ? [95, 100] : undefined} />
                <Tooltip {...chartTip} cursor={SeriesC === Bar ? { fill: 'rgba(148,163,184,0.06)' } : undefined} />
                {SeriesC === Area ? <Area type="monotone" dataKey={key} stroke={color} strokeWidth={2} fill={`url(#g-${key})`} /> :
                  SeriesC === Bar ? <Bar dataKey={key} fill={color} radius={[5, 5, 0, 0]} /> :
                  <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} />}
              </ChartC>
            </ResponsiveContainer>
          </Card>
        ))}
      </div>
    </div>
  );
}


/* ---------- INTEGRATIONS (OCPP · OCPI · payments · persistence) ---------- */
export function AdminIntegrations() {
  const [d, setD] = useState(null);
  const { socket } = useApp();
  const load = () => api('/admin/integrations').then(setD).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);

  if (!d) return <SkeletonRows n={5} />;
  const Pill = ({ ok, children }) => <span className={`chip ${ok ? 'text-primary bg-primary/10 border-primary/30' : 'text-warn bg-warn/10 border-warn/30'}`}><span className="w-1.5 h-1.5 rounded-full animate-pulseDot" style={{ background: ok ? '#A3E635' : '#F59E0B' }} />{children}</span>;

  return (
    <div className="space-y-4">
      <PageHead title="Network integrations" sub="OCPP central system · OCPI peer exchange · payment provider · durable ledger" />

      <div className="grid lg:grid-cols-2 gap-4">
        {/* OCPP */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold flex items-center gap-2"><Cable className="w-5 h-5 text-primary" /> OCPP 1.6J Central System</div>
            <Pill ok={d.ocpp.connections.length > 0}>{d.ocpp.connections.length > 0 ? `${d.ocpp.connections.length} connected` : 'Listening'}</Pill>
          </div>
          <div className="text-xs text-sub font-mono mb-4">{d.ocpp.endpoint} · subprotocol {d.ocpp.protocol}</div>
          {d.ocpp.connections.length === 0 ? (
            <div className="rounded-xl bg-card2/60 border border-line p-4 text-sm text-sub">
              No charge points connected right now. Connect the demo charge point:
              <code className="block mt-2 text-xs text-primary font-mono">node backend/tools/ocpp_demo_charger.js CH_30</code>
              It speaks real OCPP-J: BootNotification → StatusNotification → Heartbeat → MeterValues.
            </div>
          ) : d.ocpp.connections.map(c => (
            <div key={c.chargerId} className="rounded-xl bg-primary/[0.05] border border-primary/25 p-3.5 mb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm">{c.chargerId}</span>
                <Pill ok>LIVE</Pill>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-sub">
                <span>Vendor: <b className="text-ink">{c.vendor}</b></span>
                <span>Model: <b className="text-ink">{c.model}</b></span>
                <span>Firmware: <b className="text-ink">{c.firmware}</b></span>
                <span>Messages: <b className="text-ink">{c.msgCount}</b></span>
                <span>Last action: <b className="text-ink">{c.lastAction || '—'}</b></span>
                <span>Last seen: <b className="text-ink">{timeAgo(c.lastSeen)}</b></span>
              </div>
            </div>
          ))}
        </div>

        {/* Payments */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold flex items-center gap-2"><Landmark className="w-5 h-5 text-primary" /> Payment provider — {d.payments.name}</div>
            <Pill ok={d.payments.configured}>{d.payments.mode}</Pill>
          </div>
          <p className="text-xs text-sub mb-4">{d.payments.configured ? 'Sandbox keys configured — real provider API calls active.' : 'No keys configured — deterministic simulated provider with identical interface. Add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to .env for live sandbox calls.'}</p>
          <div className="space-y-2 text-sm">
            {[['Webhook endpoint', d.payments.webhookEndpoint], ['Signature scheme', d.payments.webhookScheme], ['Capabilities', d.payments.capabilities.join(' · ')]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2 border-b border-line last:border-0"><span className="text-sub">{k}</span><span className="font-mono text-xs text-right">{v}</span></div>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-card2/60 border border-line p-3 text-xs text-sub flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            Every inbound webhook is HMAC-SHA256 verified with constant-time comparison. Unsigned or tampered events are rejected (401) and audit-logged. Payment creation supports Idempotency-Key replay protection.
          </div>
        </div>

        {/* OCPI */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold flex items-center gap-2"><Network className="w-5 h-5 text-primary" /> OCPI 2.2 peer exchange</div>
            <Pill ok>{d.ocpi.peers.length} peers</Pill>
          </div>
          <div className="text-xs text-sub font-mono mb-4">{d.ocpi.endpoint} · {d.ocpi.tokenAuth}</div>
          <div className="space-y-2">
            {d.ocpi.peers.map(p => (
              <div key={p.partyId} className="flex items-center gap-3 rounded-xl bg-card2/60 border border-line p-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center font-black text-primary text-xs">{p.partyId}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p.name}</div>
                  <div className="text-[11px] text-sub">v{p.version} · {p.modules.join(', ')}</div>
                </div>
                <div className="text-right text-[11px]">
                  <div className="text-primary font-bold">{p.locationsSynced} locations</div>
                  <div className="text-sub">synced {timeAgo(p.lastSync)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Persistence */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Cloud database persistence</div>
            <Pill ok={Boolean(d.persistence.connected)}>{d.persistence.connected ? 'ONLINE' : 'DISCONNECTED'}</Pill>
          </div>
          <div className="text-xs text-sub mb-4">{d.persistence.engine}</div>
          <div className="grid grid-cols-2 gap-2 text-center mb-4">
            {[[d.persistence.persistedEntities, 'Persisted entities'], [d.persistence.ledgerEntries, 'Ledger entries (append-only)']].map(([a, b]) => (
              <div key={b} className="rounded-xl bg-card2/60 border border-line py-3"><div className="font-black text-lg text-primary">{a}</div><div className="text-[10px] text-sub uppercase font-semibold">{b}</div></div>
            ))}
          </div>
          <div className="label">Recent ledger writes</div>
          <div className="space-y-1 max-h-44 overflow-y-auto">
            {d.ledgerTail.map(l => (
              <div key={l.seq} className="text-[11px] font-mono flex gap-2 py-1 border-b border-line/50 last:border-0">
                <span className="text-slate-600">#{l.seq}</span>
                <span className="text-primary">{l.kind}</span>
                <span className="text-sub truncate">{l.id}</span>
                <span className="ml-auto text-slate-500">{l.op}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- AUDIT LEDGER (compliance) ---------- */
export function AdminAudit() {
  const [d, setD] = useState(null);
  const [entity, setEntity] = useState('');
  const [q, setQ] = useState('');
  const load = () => api(`/admin/audit?entity=${entity}&q=${encodeURIComponent(q)}`).then(setD).catch(() => {});
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [entity, q]);
  const exportCsv = async () => {
    const res = await fetch('/api/admin/audit/export', { headers: { Authorization: `Bearer ${localStorage.getItem('co_token')}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'chargeone-audit-log.csv'; a.click();
  };
  const kinds = ['', 'PAYMENT', 'REFUND', 'CHARGER', 'BOOKING', 'INCIDENT', 'DISPUTE', 'OCPP', 'OCPI', 'IOT', 'WEBHOOK', 'USER', 'FAULT_REPORT'];
  return (
    <div>
      <PageHead title="Audit ledger" sub={d ? `${d.total} immutable entries · ${d.ledger.engine}` : 'Every state transition on the platform, append-only'}
        right={<button className="btn-ghost" onClick={exportCsv}><Download className="w-4 h-4" /> Export CSV</button>} />
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sub" /><input className="input !pl-9 w-56" placeholder="Search entity / note…" value={q} onChange={e => setQ(e.target.value)} /></div>
        {kinds.map(k => <button key={k} onClick={() => setEntity(k)} className={`chip cursor-pointer ${entity === k ? 'text-bg bg-primary border-primary' : 'text-sub bg-card2 border-line'}`}>{k || 'All'}</button>)}
      </div>
      {!d ? <SkeletonRows n={8} h="h-10" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-sub border-b border-line">
              {['Time', 'Entity', 'ID', 'Transition', 'Actor', 'Note'].map(h => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}
            </tr></thead>
            <tbody>{d.logs.map(l => (
              <tr key={l.id} className="border-b border-line/60 hover:bg-card2/40">
                <td className="px-4 py-2.5 text-xs text-sub whitespace-nowrap">{fmtDateTime(l.at)}</td>
                <td className="px-4 py-2.5"><span className="chip text-sub bg-card2 border-line !text-[10px]">{l.entityType}</span></td>
                <td className="px-4 py-2.5 font-mono text-xs text-primary">{l.entityId}</td>
                <td className="px-4 py-2.5 text-xs font-mono">{l.from ? `${l.from} → ` : ''}<b>{l.to}</b></td>
                <td className="px-4 py-2.5 text-xs text-sub">{l.actor}</td>
                <td className="px-4 py-2.5 text-xs text-sub max-w-[320px] truncate">{l.note}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5"><FileClock className="w-3.5 h-3.5" /> Entries are written append-only to MongoDB Atlas. Production: WORM object storage export + 7-year retention per RBI payment-data guidelines.</p>
    </div>
  );
}
