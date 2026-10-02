import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Route, Car, History, Zap, Battery, Wallet, Activity, ChevronRight, PlugZap, Crosshair, Loader2, Navigation } from 'lucide-react';
import MapView from '../../components/MapView';
import StationCard from '../../components/StationCard';
import { StatCard, StatusBadge, SkeletonRows } from '../../components/ui';
import { api, fmtINR, timeAgo } from '../../lib/api';
import { useApp } from '../../context/AppContext';

export default function Dashboard() {
  const { user, socket, geo, locate, toast } = useApp();
  const nav = useNavigate();
  const [nearby, setNearby] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [history, setHistory] = useState([]);
  const [active, setActive] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [located, setLocated] = useState(false);
  const [locating, setLocating] = useState(false);

  const nearMe = async () => {
    setLocating(true);
    try {
      const g = await locate();
      const d = await api(`/stations/nearby?limit=12&lat=${g.lat}&lng=${g.lng}`);
      setNearby(d.stations);
      setLocated(true);
      const n = d.stations[0];
      if (n) toast(`Nearest charger: ${n.name} — ${n.distanceKm} km away`, 'info');
    } catch {} finally { setLocating(false); }
  };

  useEffect(() => {
    api('/stations/nearby?limit=12').then(d => setNearby(d.stations)).catch(() => setNearby([]));
    api('/vehicles').then(d => setVehicles(d.vehicles)).catch(() => {});
    api('/history').then(d => setHistory(d.sessions)).catch(() => {});
    api('/sessions/active').then(d => setActive(d.session)).catch(() => {});
    api('/wallet').then(setWallet).catch(() => {});
  }, []);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const upd = (d) => { if (d.userId === user.id || (active && d.id === active.id)) setActive(d.live ? d : null); };
    const started = (d) => { if (d.userId === user.id) api('/sessions/active').then(r => setActive(r.session)); };
    s.on('session:update', upd); s.on('session:started', started);
    return () => { s.off('session:update', upd); s.off('session:started', started); };
  }, [socket, active, user.id]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const veh = vehicles.find(v => v.primary) || vehicles[0];
  const lastDone = history.find(h => h.status === 'COMPLETED');
  const avail = nearby?.reduce((a, s) => a + (s.counts?.available || 0), 0) ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{greet}, {user.name.split(' ')[0]} <span className="inline-block animate-floatY">⚡</span></h1>
          <p className="text-sm text-sub mt-1">{veh ? `${veh.brand} ${veh.model} ready to roll` : 'Add your EV to unlock compatibility filtering'}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/stations" className="btn-primary"><MapPin className="w-4 h-4" /> Find Charger</Link>
          <Link to="/route-planner" className="btn-ghost"><Route className="w-4 h-4" /> Plan Trip</Link>
        </div>
      </div>

      {active && (
        <Link to={`/charging/${active.id}`} className="card p-4 md:p-5 flex items-center gap-4 border-cyan-400/40 hover:border-cyan-300 transition block">
          <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center"><Zap className="w-6 h-6 text-cyan-300 fill-cyan-300 bolt-anim" /></div>
          <div className="flex-1 min-w-0">
            <div className="font-bold flex items-center gap-2">Charging in progress <StatusBadge status="CHARGING" /></div>
            <div className="text-sm text-sub truncate">{active.stationName} · {active.chargerCode} · {active.powerNow} kW · {fmtINR(active.estimatedCost)}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-cyan-300">{Math.round(active.pct)}%</div>
            <div className="text-[10px] text-sub font-semibold">TAP TO MONITOR</div>
          </div>
        </Link>
      )}

      {/* Vehicle + stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="card p-4 md:p-5 col-span-2 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0"><Car className="w-7 h-7 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-sub">Current vehicle</div>
            <div className="font-extrabold truncate">{veh ? `${veh.brand} ${veh.model}` : 'No vehicle yet'}</div>
            {veh && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1"><span className="text-sub flex items-center gap-1"><Battery className="w-3.5 h-3.5 text-primary" />{veh.batteryPct}%</span><span className="font-bold text-primary">~{veh.rangeKm} km range</span></div>
                <div className="h-2 rounded-full bg-card2 overflow-hidden"><div className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full transition-all duration-1000" style={{ width: `${veh.batteryPct}%` }} /></div>
              </div>
            )}
          </div>
          <Link to="/vehicles" className="btn-ghost !p-2 shrink-0"><ChevronRight className="w-4 h-4" /></Link>
        </div>
        <StatCard icon={PlugZap} label="Nearby chargers" value={nearby ? nearby.length : '—'} sub={`${avail} available now`} tone="primary" />
        <StatCard icon={Wallet} label="Wallet balance" value={wallet ? fmtINR(wallet.balance) : '—'} sub={lastDone ? `Last session ${fmtINR(lastDone.finalAmount)}` : 'No sessions yet'} />
      </div>

      {/* Map + nearby list */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        <div className="h-[380px] lg:h-auto min-h-[380px] relative">
          <MapView stations={nearby || []} fit={!located && !!nearby?.length} center={located && geo ? [geo.lat, geo.lng] : [19.076, 72.8777]} zoom={located ? 12 : 11} onSelect={(s) => nav(`/station/${s.id}`)} userPos={geo} />
          <button onClick={nearMe} disabled={locating}
            className={`absolute top-3 right-3 z-[500] btn !py-2 !px-3 !text-xs shadow-card ${located ? 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/50' : 'btn-primary'}`}>
            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
            {located ? 'Live location' : 'Near me'}
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Nearby chargers</div>
            <Link to="/app/stations" className="text-xs text-primary font-semibold">See all →</Link>
          </div>
          {located && nearby?.[0] && (
            <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${geo.lat},${geo.lng}&destination=${nearby[0].lat},${nearby[0].lng}`, '_blank')}
              className="w-full card p-3 border-cyan-400/40 flex items-center gap-3 text-left hover:border-cyan-300 transition animate-fadeUp">
              <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center"><Navigation className="w-4 h-4 text-cyan-300" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black text-cyan-300 uppercase tracking-widest">Nearest to you</div>
                <div className="text-sm font-bold truncate">{nearby[0].name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-cyan-300">{nearby[0].distanceKm} km</div>
                <div className="text-[9px] text-sub font-semibold">TAP TO NAVIGATE</div>
              </div>
            </button>
          )}
          <div className="space-y-3 lg:max-h-[330px] lg:overflow-y-auto lg:pr-1">
            {!nearby ? <SkeletonRows n={3} /> : nearby.slice(0, 4).map(s => <StationCard key={s.id} s={s} compact />)}
          </div>
        </div>
      </div>

      {/* Quick actions + recent */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="font-bold text-sm mb-3">Quick actions</div>
          <div className="grid grid-cols-2 gap-2">
            {[['Find Charger', MapPin, '/app/stations'], ['Plan Trip', Route, '/route-planner'], ['My Vehicles', Car, '/vehicles'], ['Charging History', History, '/history']].map(([l, I, to]) => (
              <Link key={l} to={to} className="btn-ghost justify-start !py-3"><I className="w-4 h-4 text-primary" /> {l}</Link>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-sm">Recent charging</div>
            <Link to="/history" className="text-xs text-primary font-semibold">History →</Link>
          </div>
          <div className="space-y-2">
            {history.slice(0, 3).map(h => (
              <Link key={h.id} to={`/history/${h.paymentId}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-card2 transition">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${h.status === 'COMPLETED' ? 'bg-primary/10 border-primary/25' : 'bg-danger/10 border-danger/25'}`}>
                  <Zap className={`w-4 h-4 ${h.status === 'COMPLETED' ? 'text-primary' : 'text-danger'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{h.stationName}</div>
                  <div className="text-xs text-sub">{timeAgo(h.startTime)} · {h.energyKwh ? `${h.energyKwh.toFixed(1)} kWh` : 'session failed'}</div>
                </div>
                <div className="text-sm font-bold">{h.status === 'COMPLETED' ? fmtINR(h.finalAmount) : <span className="text-danger text-xs">Refunded</span>}</div>
              </Link>
            ))}
            {history.length === 0 && <div className="text-sm text-sub py-4 text-center">No sessions yet — find a charger to get started.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
