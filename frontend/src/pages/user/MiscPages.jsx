import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Wallet as WalletIcon, Plus, Heart, Bell, Car, Trash2, Star, CalendarClock, X, AlertTriangle, Camera, CheckCircle2, User, LifeBuoy, Zap, RotateCcw, PlugZap, Loader2 } from 'lucide-react';
import { PageHead, StatusBadge, SkeletonRows, EmptyState, Modal, Confirm, Spinner } from '../../components/ui';
import StationCard from '../../components/StationCard';
import { api, fmtINR, fmtDateTime, timeAgo, fmtDate } from '../../lib/api';
import { useApp } from '../../context/AppContext';

/* ---------- WALLET ---------- */
export function Wallet() {
  const [data, setData] = useState(null);
  const [add, setAdd] = useState(false);
  const [amt, setAmt] = useState(500);
  const [customAmt, setCustomAmt] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast, user, setUser } = useApp();
  const load = () => api('/wallet').then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  // Load Razorpay checkout script dynamically
  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const handleRecharge = async () => {
    const finalAmt = customAmt ? +customAmt : amt;
    if (!finalAmt || finalAmt < 10 || finalAmt > 10000) {
      toast('Enter an amount between ₹10 and ₹10,000', 'error'); return;
    }
    setBusy(true);
    try {
      await loadRazorpay();
      const order = await api('/wallet/recharge/order', { method: 'POST', body: { amount: finalAmt } });

      if (order.keyId && window.Razorpay) {
        await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: order.keyId,
            amount: order.amountPaise,
            currency: 'INR',
            name: 'ChargeOne',
            description: 'Wallet Recharge',
            order_id: order.orderId,
            prefill: { name: user?.name || '', email: user?.email || '' },
            theme: { color: '#A3E635' },
            handler: async (response) => {
              try {
                const result = await api('/wallet/recharge/verify', {
                  method: 'POST',
                  body: {
                    orderId: response.razorpay_order_id,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                    amount: finalAmt,
                  },
                });
                setUser(u => ({ ...u, walletBalance: result.balance }));
                toast(`${fmtINR(finalAmt, 0)} added to your wallet!`);
                setAdd(false); setCustomAmt(''); load(); resolve();
              } catch (e) { reject(e); }
            },
            modal: { ondismiss: () => reject(new Error('dismissed')) },
          });
          rzp.open();
        });
      } else {
        // No Razorpay keys — safe direct credit
        const result = await api('/wallet/recharge/verify', {
          method: 'POST',
          body: { orderId: order.orderId, paymentId: null, signature: null, amount: finalAmt },
        });
        setUser(u => ({ ...u, walletBalance: result.balance }));
        toast(`${fmtINR(finalAmt, 0)} added to your wallet!`);
        setAdd(false); setCustomAmt(''); load();
      }
    } catch (e) {
      if (e.message !== 'dismissed') toast(e.message || 'Payment failed. Please try again.', 'error');
    } finally { setBusy(false); }
  };

  const PRESETS = [200, 500, 1000, 2000];

  return (
    <div className="max-w-3xl mx-auto">
      <PageHead title="Wallet" sub="Your ChargeOne balance for EV charging sessions" />
      <div className="card p-6 md:p-8 mb-5 relative overflow-hidden border-primary/25">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(400px 180px at 20% 0%, rgba(163,230,53,0.10), transparent)' }} />
        <div className="text-xs font-semibold uppercase tracking-widest text-sub">Available balance</div>
        <div className="text-4xl md:text-5xl font-black mt-2 text-primary">{data ? fmtINR(data.balance) : '—'}</div>
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button className="btn-primary" onClick={() => setAdd(true)}><Plus className="w-4 h-4" /> Add Money</button>
          <span className="text-xs text-sub flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Secured by Razorpay
          </span>
        </div>
      </div>
      <div className="card p-5">
        <div className="font-bold mb-3">Transaction History</div>
        {!data ? <SkeletonRows n={4} h="h-12" /> : data.transactions.length === 0 ? <div className="text-sm text-sub py-6 text-center">No wallet activity yet.</div> : (
          <div className="space-y-1">
            {data.transactions.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${t.amount > 0 ? 'bg-primary/10 border-primary/25' : 'bg-card2 border-line'}`}>
                  {t.amount > 0 ? <Plus className="w-4 h-4 text-primary" /> : <Zap className="w-4 h-4 text-sub" />}
                </div>
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{t.label}</div><div className="text-xs text-sub">{fmtDateTime(t.at)}</div></div>
                <div className={`font-bold ${t.amount > 0 ? 'text-primary' : ''}`}>{t.amount > 0 ? '+' : ''}{fmtINR(t.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal open={add} onClose={() => { setAdd(false); setCustomAmt(''); }} title="Add money to wallet">
        <div className="space-y-4">
          <div>
            <div className="text-xs text-sub font-semibold mb-2 uppercase tracking-wider">Quick amounts</div>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map(a => (
                <button key={a} onClick={() => { setAmt(a); setCustomAmt(''); }}
                  className={`btn !py-3 border font-bold ${amt === a && !customAmt ? 'bg-primary text-bg border-primary' : 'bg-card2 border-line text-sub'}`}>
                  ₹{a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-sub font-semibold mb-2 uppercase tracking-wider">Or enter custom amount</div>
            <input
              className="input"
              type="number"
              min="10"
              max="10000"
              placeholder="Enter amount (₹10 – ₹10,000)"
              value={customAmt}
              onChange={e => setCustomAmt(e.target.value)}
            />
          </div>
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs text-sub flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            Payment secured by Razorpay. Your wallet will be credited instantly on successful payment.
          </div>
          <button className="btn-primary w-full !py-3.5" onClick={handleRecharge} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <WalletIcon className="w-4 h-4" />}
            {busy ? 'Processing…' : `Add ${fmtINR(customAmt ? +customAmt : amt, 0)} to Wallet`}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ---------- FAVORITES ---------- */
export function Favorites() {
  const [stations, setStations] = useState(null);
  const { toast } = useApp();
  const load = () => api('/favorites').then(d => setStations(d.stations)).catch(() => setStations([]));
  useEffect(() => { load(); }, []);
  const unfav = async (s) => { await api(`/favorites/${s.id}`, { method: 'POST' }); toast('Removed from favorites', 'info'); load(); };
  return (
    <div>
      <PageHead title="Favorite stations" sub="Your go-to chargers with live availability, price and reliability" />
      {!stations ? <SkeletonRows n={3} /> : stations.length === 0 ? (
        <EmptyState icon={Heart} title="No favorites yet" sub="Save stations you trust for one-tap access." action={<Link to="/app/stations" className="btn-primary">Browse Stations</Link>} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">{stations.map(s => <StationCard key={s.id} s={s} onFav={unfav} fav />)}</div>
      )}
    </div>
  );
}

/* ---------- NOTIFICATIONS ---------- */
export function Notifications() {
  const [list, setList] = useState(null);
  const { setUnread } = useApp();
  useEffect(() => {
    api('/notifications').then(d => setList(d.notifications)).catch(() => setList([]));
    api('/notifications/read', { method: 'POST' }).then(() => setUnread(0)).catch(() => {});
  }, []);
  const icons = { refund: RotateCcw, session: Zap, charger: PlugZap, fault: AlertTriangle, booking: CalendarClock, info: Bell };
  return (
    <div className="max-w-2xl mx-auto">
      <PageHead title="Notifications" sub="Session, payment, refund and charger alerts" />
      {!list ? <SkeletonRows n={5} h="h-16" /> : list.length === 0 ? <EmptyState icon={Bell} title="All caught up" sub="Notifications about sessions, refunds and chargers appear here." /> : (
        <div className="space-y-2">
          {list.map(n => {
            const I = icons[n.type] || Bell;
            return (
              <div key={n.id} className={`card p-4 flex gap-3 ${!n.read ? 'border-primary/30' : ''}`}>
                <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border ${n.type === 'fault' ? 'bg-warn/10 border-warn/30' : 'bg-primary/10 border-primary/25'}`}>
                  <I className={`w-4.5 h-4.5 w-4 h-4 ${n.type === 'fault' ? 'text-warn' : 'text-primary'}`} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm">{n.title}</div>
                  <div className="text-sm text-sub mt-0.5">{n.body}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{timeAgo(n.at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- PROFILE ---------- */
export function Profile() {
  const { user, toast, logout } = useApp();
  const nav = useNavigate();
  return (
    <div className="max-w-2xl mx-auto">
      <PageHead title="Profile" />
      <div className="card p-6 flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-2xl font-black text-primary">{user.name[0]}</div>
        <div>
          <div className="text-lg font-extrabold">{user.name}</div>
          <div className="text-sm text-sub">{user.email} · {user.phone}</div>
          <StatusBadge status={user.status} className="mt-1.5" />
        </div>
      </div>
      <div className="card p-5 mb-4">
        <div className="font-bold mb-3 text-sm">Account</div>
        {[['Member since', fmtDate(user.joined)], ['City', user.city], ['Role', 'EV Driver'], ['Wallet', fmtINR(user.walletBalance)]].map(([k, v]) => (
          <div key={k} className="flex justify-between py-2.5 border-b border-line last:border-0 text-sm"><span className="text-sub">{k}</span><span className="font-semibold">{v}</span></div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/vehicles" className="btn-ghost !py-3"><Car className="w-4 h-4 text-primary" /> My Vehicles</Link>
        <Link to="/app/support" className="btn-ghost !py-3"><LifeBuoy className="w-4 h-4 text-primary" /> Support</Link>
        <Link to="/refunds" className="btn-ghost !py-3"><RotateCcw className="w-4 h-4 text-primary" /> Refund Center</Link>
        <button className="btn-danger !py-3" onClick={() => { logout(); nav('/'); }}>Sign out</button>
      </div>
    </div>
  );
}

/* ---------- BOOKINGS ---------- */
export function Booking() {
  const [bookings, setBookings] = useState(null);
  const [cancel, setCancel] = useState(null);
  const { toast } = useApp();
  const load = () => api('/bookings').then(d => setBookings(d.bookings)).catch(() => setBookings([]));
  useEffect(() => { load(); }, []);
  const doCancel = async () => { await api(`/bookings/${cancel.id}`, { method: 'DELETE' }); toast('Reservation cancelled', 'info'); load(); };
  return (
    <div className="max-w-3xl mx-auto">
      <PageHead title="Reservations" sub="Reserved chargers are held for you for 15 minutes past the start time" right={<Link to="/app/stations" className="btn-primary"><Plus className="w-4 h-4" /> New Reservation</Link>} />
      {!bookings ? <SkeletonRows n={3} /> : bookings.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No reservations" sub="Reserve an available charger from any station page." action={<Link to="/app/stations" className="btn-primary">Find a Charger</Link>} />
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="card p-4 flex flex-wrap items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center"><CalendarClock className="w-5 h-5 text-primary" /></div>
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-xs font-bold text-primary">{b.id}</span><StatusBadge status={b.status} /></div>
                <div className="font-semibold text-sm mt-0.5">{b.stationName} · {b.chargerCode}</div>
                <div className="text-xs text-sub">{b.date} at {b.startTime} · {b.durationMin} min · {b.connector} {b.powerKw} kW</div>
              </div>
              {b.status === 'CONFIRMED' && <button className="btn-danger !py-2 !text-xs" onClick={() => setCancel(b)}><X className="w-3.5 h-3.5" /> Cancel</button>}
            </div>
          ))}
        </div>
      )}
      <Confirm open={!!cancel} onClose={() => setCancel(null)} onConfirm={doCancel} danger title="Cancel reservation?" body={`Reservation ${cancel?.id} at ${cancel?.stationName} will be released for other drivers.`} confirmLabel="Cancel Reservation" />
    </div>
  );
}

/* ---------- VEHICLES ---------- */
export function Vehicles() {
  const [vehicles, setVehicles] = useState(null);
  const [add, setAdd] = useState(false);
  const [del, setDel] = useState(null);
  const [form, setForm] = useState({ name: '', brand: 'Tata', model: '', batteryKwh: 40.5, connector: 'CCS2', batteryPct: 70, rangeKm: 220 });
  const { toast } = useApp();
  const load = () => api('/vehicles').then(d => setVehicles(d.vehicles)).catch(() => setVehicles([]));
  useEffect(() => { load(); }, []);
  const save = async () => {
    try { await api('/vehicles', { method: 'POST', body: form }); toast('Vehicle added'); setAdd(false); load(); }
    catch (e) { toast(e.message, 'error'); }
  };
  const makePrimary = async (v) => { await api(`/vehicles/${v.id}`, { method: 'PATCH', body: { primary: true } }); toast(`${v.name} is now your primary EV`); load(); };
  const remove = async () => { await api(`/vehicles/${del.id}`, { method: 'DELETE' }); toast('Vehicle removed', 'info'); load(); };
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-3xl mx-auto">
      <PageHead title="My vehicles" sub="Chargers are automatically filtered for connector compatibility" right={<button className="btn-primary" onClick={() => setAdd(true)}><Plus className="w-4 h-4" /> Add EV</button>} />
      {!vehicles ? <SkeletonRows n={2} /> : vehicles.length === 0 ? (
        <EmptyState icon={Car} title="No vehicles yet" sub="Add your EV to unlock compatibility filtering and route planning." action={<button className="btn-primary" onClick={() => setAdd(true)}>Add Your EV</button>} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {vehicles.map(v => (
            <div key={v.id} className={`card p-5 ${v.primary ? 'border-primary/40' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center"><Car className="w-6 h-6 text-primary" /></div>
                {v.primary ? <span className="chip text-primary bg-primary/10 border-primary/30"><Star className="w-3 h-3 fill-primary" /> Primary</span> :
                  <button className="text-xs text-sub hover:text-primary font-semibold" onClick={() => makePrimary(v)}>Set primary</button>}
              </div>
              <div className="font-extrabold mt-3">{v.name}</div>
              <div className="text-sm text-sub">{v.brand} {v.model}</div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-center">
                {[[`${v.batteryKwh} kWh`, 'Battery'], [v.connector, 'Connector'], [`${v.batteryPct}%`, 'Charge'], [`~${v.rangeKm} km`, 'Range']].map(([a, b]) => (
                  <div key={b} className="rounded-xl bg-card2/60 border border-line py-2"><div className="font-bold text-sm">{a}</div><div className="text-[10px] text-sub uppercase font-semibold">{b}</div></div>
                ))}
              </div>
              <div className="mt-3">
                <div className="h-2 rounded-full bg-card2 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-700" style={{ width: `${v.batteryPct}%` }} /></div>
              </div>
              <button className="btn-ghost w-full mt-4 !py-2 !text-xs !text-danger" onClick={() => setDel(v)}><Trash2 className="w-3.5 h-3.5" /> Remove</button>
            </div>
          ))}
        </div>
      )}
      <Modal open={add} onClose={() => setAdd(false)} title="Add vehicle" wide>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Vehicle name</label><input className="input" value={form.name} onChange={set('name')} placeholder="My Nexon" /></div>
          <div><label className="label">Brand</label>
            <select className="input" value={form.brand} onChange={set('brand')}>{['Tata', 'Mahindra', 'MG', 'BYD', 'Hyundai', 'Kia', 'Ather', 'Ola'].map(b => <option key={b}>{b}</option>)}</select></div>
          <div><label className="label">Model</label><input className="input" value={form.model} onChange={set('model')} placeholder="Nexon EV LR" /></div>
          <div><label className="label">Battery (kWh)</label><input type="number" className="input" value={form.batteryKwh} onChange={set('batteryKwh')} /></div>
          <div><label className="label">Connector</label>
            <select className="input" value={form.connector} onChange={set('connector')}>{['CCS2', 'Type 2', 'CHAdeMO'].map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label">Current battery %</label><input type="number" min="0" max="100" className="input" value={form.batteryPct} onChange={set('batteryPct')} /></div>
          <div><label className="label">Estimated range (km)</label><input type="number" className="input" value={form.rangeKm} onChange={set('rangeKm')} /></div>
        </div>
        <button className="btn-primary w-full mt-5" onClick={save}>Save Vehicle</button>
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={remove} danger title="Remove vehicle?" body={`${del?.name} will be removed from your garage.`} confirmLabel="Remove" />
    </div>
  );
}

/* ---------- REPORT FAULT ---------- */
export function ReportFault() {
  const [sp] = useSearchParams();
  const [stations, setStations] = useState([]);
  const [stationId, setStationId] = useState(sp.get('station') || '');
  const [chargerId, setChargerId] = useState('');
  const [issue, setIssue] = useState('');
  const [desc, setDesc] = useState('');
  const [photo, setPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const { toast } = useApp();
  useEffect(() => { api('/stations').then(d => setStations(d.stations)).catch(() => {}); }, []);
  const station = stations.find(s => s.id === stationId);
  const issues = ["Charger won't start", 'Payment problem', 'Connector damaged', 'Display not working', 'Charger offline', 'Other'];
  const submit = async () => {
    if (!stationId || !issue) return toast('Select a station and issue type', 'warn');
    setBusy(true);
    try { const d = await api('/reports', { method: 'POST', body: { stationId, chargerId, issue, description: desc, photo } }); setDone(d.report); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  if (done) return (
    <div className="max-w-lg mx-auto">
      <div className="card p-8 text-center animate-fadeUp">
        <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-4" />
        <div className="text-sm text-sub">Issue reference</div>
        <div className="text-3xl font-black font-mono text-primary">{done.id}</div>
        <StatusBadge status="UNDER_VERIFICATION" className="mt-3" />
        <p className="text-sm text-sub mt-4">The charger has been temporarily marked <b className="text-warn">WARNING / UNDER VERIFICATION</b> for other drivers. The operator and ChargeOne admin have been notified.</p>
        <div className="flex gap-2 mt-6">
          <Link to="/dashboard" className="btn-ghost flex-1">Back to Dashboard</Link>
          <Link to="/app/support" className="btn-primary flex-1">Track in Support</Link>
        </div>
      </div>
    </div>
  );
  return (
    <div className="max-w-lg mx-auto">
      <PageHead title="Report a charger fault" sub="Reports flag the charger for other drivers and alert the operator instantly" />
      <div className="card p-5 md:p-6 space-y-4">
        <div>
          <div className="label">What is wrong?</div>
          <div className="grid grid-cols-2 gap-2">
            {issues.map(i => (
              <button key={i} onClick={() => setIssue(i)} className={`btn !py-3 !text-xs !justify-start border ${issue === i ? 'bg-warn/15 text-warn border-warn/50' : 'bg-card2 border-line text-sub hover:border-slate-500'}`}>
                <AlertTriangle className="w-3.5 h-3.5" /> {i}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Location / station</label>
          <select className="input" value={stationId} onChange={e => { setStationId(e.target.value); setChargerId(''); }}>
            <option value="">Select station…</option>
            {stations.map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
          </select>
        </div>
        {station && (
          <div>
            <label className="label">Charger ID (optional)</label>
            <select className="input" value={chargerId} onChange={e => setChargerId(e.target.value)}>
              <option value="">Not sure</option>
              {station.chargers.map(c => <option key={c.id} value={c.id}>{c.code} · {c.connector} {c.powerKw} kW</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[90px]" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What happened? Error on screen, connector state, payment status…" />
        </div>
        <button onClick={() => { setPhoto(!photo); }} className={`btn-ghost w-full !justify-start ${photo ? '!border-primary/50 !text-primary' : ''}`}>
          <Camera className="w-4 h-4" /> {photo ? 'Photo attached — charger_fault.jpg (simulated)' : 'Attach photo (simulated upload)'}
        </button>
        <button className="btn-primary w-full !py-3" disabled={busy} onClick={submit}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />} Submit Report</button>
      </div>
    </div>
  );
}

/* ---------- SUPPORT (user) ---------- */
export function SupportUser() {
  const [reports, setReports] = useState(null);
  useEffect(() => { api('/reports').then(d => setReports(d.reports)).catch(() => setReports([])); }, []);
  return (
    <div className="max-w-3xl mx-auto">
      <PageHead title="Support" sub="One support surface for every network you charge on" />
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Link to="/support/report" className="card card-hover p-5"><AlertTriangle className="w-5 h-5 text-warn mb-3" /><div className="font-bold text-sm">Report a fault</div><div className="text-xs text-sub mt-1">Charger not working? Flag it in 20 seconds.</div></Link>
        <Link to="/refunds" className="card card-hover p-5"><RotateCcw className="w-5 h-5 text-primary mb-3" /><div className="font-bold text-sm">Refund Center</div><div className="text-xs text-sub mt-1">Track reversals and adjustments step by step.</div></Link>
        <a href="mailto:support@chargeone.demo" className="card card-hover p-5"><LifeBuoy className="w-5 h-5 text-cyan-300 mb-3" /><div className="font-bold text-sm">Contact us</div><div className="text-xs text-sub mt-1">support@chargeone.demo · 1800-CHARGE-1</div></a>
      </div>
      <div className="card p-5">
        <div className="font-bold mb-3">Your fault reports</div>
        {!reports ? <SkeletonRows n={2} h="h-14" /> : reports.length === 0 ? <div className="text-sm text-sub text-center py-6">No reports filed. Hopefully it stays that way!</div> : (
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-3 border-b border-line last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-xs font-bold text-primary">{r.id}</span><StatusBadge status={r.status} /></div>
                  <div className="text-sm font-semibold mt-0.5">{r.issue}</div>
                  <div className="text-xs text-sub">{r.stationName} · {r.chargerCode} · {fmtDate(r.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
