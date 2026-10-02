import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Route, Zap, MapPin, Clock, IndianRupee, Battery, ArrowDown, Loader2, Navigation } from 'lucide-react';
import MapView from '../../components/MapView';
import { PageHead, HealthRing, StatusBadge } from '../../components/ui';
import { api, fmtINR } from '../../lib/api';
import { useApp } from '../../context/AppContext';

const CITIES = ['Mumbai', 'Navi Mumbai', 'Thane', 'Pune', 'Bengaluru', 'Delhi', 'Hyderabad'];

export default function RoutePlanner() {
  const { toast } = useApp();
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ from: 'Mumbai', to: 'Pune', vehicleId: '', batteryPct: 72 });
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/vehicles').then(d => {
      setVehicles(d.vehicles);
      const p = d.vehicles.find(v => v.primary) || d.vehicles[0];
      if (p) setForm(f => ({ ...f, vehicleId: p.id, batteryPct: p.batteryPct }));
    }).catch(() => {});
  }, []);

  const veh = vehicles.find(v => v.id === form.vehicleId);

  const go = async () => {
    if (form.from === form.to) return toast('Pick two different cities', 'warn');
    setBusy(true);
    try {
      const d = await api('/route-plan', { method: 'POST', body: { from: form.from, to: form.to, batteryPct: +form.batteryPct, connector: veh?.connector || 'CCS2', rangeFullKm: veh?.fullRangeKm || 325 } });
      setPlan(d);
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const routeCoords = plan ? [plan.coords.from, ...plan.stops.map(s => [s.station.lat, s.station.lng]), plan.coords.to] : null;

  return (
    <div>
      <PageHead title="Route charging planner" sub="Stops chosen by range, connector compatibility, live availability and reliability" />
      <div className="grid lg:grid-cols-[380px_1fr] gap-4">
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Start</label>
                <select className="input" value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))}>{CITIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label className="label">Destination</label>
                <select className="input" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))}>{CITIES.map(c => <option key={c}>{c}</option>)}</select></div>
            </div>
            <div>
              <label className="label">Vehicle</label>
              {vehicles.length ? (
                <select className="input" value={form.vehicleId} onChange={e => { const v = vehicles.find(x => x.id === e.target.value); setForm(f => ({ ...f, vehicleId: e.target.value, batteryPct: v?.batteryPct ?? f.batteryPct })); }}>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} · {v.connector}</option>)}
                </select>
              ) : <Link to="/vehicles" className="btn-ghost w-full">Add a vehicle first</Link>}
            </div>
            <div>
              <label className="label">Current battery — {form.batteryPct}%</label>
              <input type="range" min="5" max="100" value={form.batteryPct} onChange={e => setForm(f => ({ ...f, batteryPct: +e.target.value }))} className="w-full accent-[#A3E635]" />
            </div>
            <button className="btn-primary w-full !py-3" onClick={go} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />} Plan My Route</button>
          </div>

          {plan && (
            <div className="card p-5 animate-fadeUp">
              <div className="grid grid-cols-3 gap-2 text-center mb-5">
                {[[`${plan.distKm} km`, 'Distance'], [`${Math.floor(plan.driveMin / 60)}h ${plan.driveMin % 60}m`, 'Driving'], [plan.needsCharging ? `${plan.totalChargeMin} min` : 'None', 'Charging']].map(([a, b]) => (
                  <div key={b} className="rounded-xl bg-card2/60 border border-line py-2.5"><div className="font-extrabold text-sm">{a}</div><div className="text-[10px] text-sub uppercase font-semibold">{b}</div></div>
                ))}
              </div>

              {/* Route timeline */}
              <div className="space-y-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center"><MapPin className="w-4 h-4 text-primary" /></div>
                  <div><div className="font-bold text-sm">{plan.from}</div><div className="text-xs text-sub flex items-center gap-1"><Battery className="w-3 h-3 text-primary" /> Start at {plan.batteryPct}% · usable ~{plan.usableRangeKm} km</div></div>
                </div>
                {plan.stops.map((st, i) => (
                  <React.Fragment key={i}>
                    <div className="ml-4 border-l-2 border-dashed border-line pl-7 py-2.5 text-xs text-sub flex items-center gap-1.5"><ArrowDown className="w-3.5 h-3.5" /> {st.legKm} km</div>
                    <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-3.5">
                      <div className="flex items-center gap-3">
                        <HealthRing score={st.station.health} size={42} stroke={4.5} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-black text-primary uppercase tracking-wider">Charging Stop #{i + 1}</div>
                          <div className="font-bold text-sm truncate">{st.station.name}</div>
                          <div className="text-xs text-sub">{st.powerKw} kW fast charger · {st.station.counts.available} available now</div>
                          {st.forecast && (
                            <div className={`text-[11px] font-bold mt-0.5 ${st.forecast.band === 'HIGH' ? 'text-primary' : st.forecast.band === 'MEDIUM' ? 'text-warn' : 'text-danger'}`}>
                              ⚡ {st.forecast.availabilityPct}% predicted free at your ETA
                            </div>
                          )}
                        </div>
                        <StatusBadge status={st.station.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2.5 text-center text-xs">
                        <div className="rounded-lg bg-bg/50 py-1.5"><Clock className="w-3 h-3 inline mr-1 text-primary" /><b>{st.chargeMin} min</b></div>
                        <div className="rounded-lg bg-bg/50 py-1.5"><Zap className="w-3 h-3 inline mr-1 text-primary" /><b>+{st.addPct}%</b></div>
                        <div className="rounded-lg bg-bg/50 py-1.5"><IndianRupee className="w-3 h-3 inline mr-1 text-primary" /><b>~{fmtINR(st.estCost, 0)}</b></div>
                      </div>
                      <Link to={`/station/${st.station.id}`} className="btn-ghost w-full mt-2.5 !py-1.5 !text-xs">View Station</Link>
                    </div>
                  </React.Fragment>
                ))}
                <div className="ml-4 border-l-2 border-dashed border-line pl-7 py-2.5 text-xs text-sub flex items-center gap-1.5"><ArrowDown className="w-3.5 h-3.5" /> {plan.lastLegKm} km</div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-400/15 border border-cyan-400/40 flex items-center justify-center"><Navigation className="w-4 h-4 text-cyan-300" /></div>
                  <div><div className="font-bold text-sm">{plan.to}</div><div className="text-xs text-sub">Arrive with comfortable buffer</div></div>
                </div>
              </div>

              {!plan.needsCharging && <div className="mt-4 rounded-xl bg-primary/10 border border-primary/30 p-3 text-sm text-primary">✓ Your current charge covers this trip — no stops needed. Drive safe!</div>}
              {plan.needsCharging && <div className="mt-4 text-xs text-sub">Estimated charging cost: <b className="text-primary">{fmtINR(plan.totalEstCost, 0)}</b>. Stops re-rank automatically if availability changes.</div>}
            </div>
          )}
        </div>
        <div className="h-[420px] lg:h-[calc(100vh-190px)] lg:sticky lg:top-20">
          <MapView stations={plan ? plan.stops.map(s => s.station) : []} route={routeCoords} center={[19.076, 72.9]} zoom={9} />
        </div>
      </div>
    </div>
  );
}
