import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { MapPin, Star, Navigation, CalendarClock, AlertTriangle, Zap, Clock, CheckCircle2, XCircle, Loader2, BadgeCheck, ChevronLeft, Car, ShieldCheck, Heart, TrendingUp } from 'lucide-react';
import MapView from '../../components/MapView';
import { StatusBadge, HealthRing, HealthFactors, Modal, Spinner, PageHead } from '../../components/ui';
import { api, fmtINR, meta } from '../../lib/api';
import { useApp } from '../../context/AppContext';

/* ============ CHARGE FLOW (pre-check → authorize → handshake) ============ */
function ChargeFlow({ charger, station, onClose }) {
  const nav = useNavigate();
  const { toast } = useApp();
  const [step, setStep] = useState('precheck'); // precheck | amount | paying | handshake | failed
  const [checks, setChecks] = useState([]);
  const [shown, setShown] = useState(0);
  const [precheck, setPrecheck] = useState(null);
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState('UPI');
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [payment, setPayment] = useState(null);
  const [failInfo, setFailInfo] = useState(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    api('/vehicles').then(d => { setVehicles(d.vehicles); const p = d.vehicles.find(v => v.primary); if (p) setVehicleId(p.id); }).catch(() => {});
    api(`/chargers/${charger.id}/precheck`).then(d => {
      setPrecheck(d); setChecks(d.checks);
      d.checks.forEach((_, i) => timers.current.push(setTimeout(() => setShown(i + 1), 350 * (i + 1))));
    }).catch(e => toast(e.message, 'error'));
  }, [charger.id]);

  const allPass = precheck && checks.every(c => c.pass);
  const doneRevealing = precheck && shown >= checks.length;

  const authorize = async () => {
    setStep('paying');
    try {
      const d = await api('/payments/create', { method: 'POST', body: { chargerId: charger.id, amount, method } });
      setPayment(d.payment);
      timers.current.push(setTimeout(async () => {
        setStep('handshake');
        try {
          const r = await api('/sessions/start', { method: 'POST', body: { paymentId: d.payment.id, chargerId: charger.id, vehicleId } });
          timers.current.push(setTimeout(() => {
            if (r.ok) { toast('Handshake OK — charging started!'); nav(`/charging/${r.session.id}`); }
            else { setFailInfo(r); setStep('failed'); }
          }, 2200));
        } catch (e) { toast(e.message, 'error'); setStep('amount'); }
      }, 1600));
    } catch (e) { toast(e.message, 'error'); setStep('amount'); }
  };

  return (
    <Modal open onClose={onClose} title={step === 'failed' ? 'Charging not started' : `Charge Now — ${charger.code}`} wide={step === 'amount'}>
      {step === 'precheck' && (
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-sub mb-1">Charger pre-check</div>
          <p className="text-xs text-sub mb-4">Verifying the charger before any payment is authorized.</p>
          {!precheck ? <Spinner label="Contacting charger…" /> : (
            <div className="space-y-2.5">
              {checks.map((c, i) => (
                <div key={c.label} className={`flex items-center gap-3 text-sm transition-all duration-300 ${i < shown ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                  {i < shown ? (c.pass ? <CheckCircle2 className="w-4.5 h-4.5 w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-danger" />) : <Loader2 className="w-5 h-5 text-sub animate-spin" />}
                  <span className={c.pass ? '' : 'text-danger font-semibold'}>{c.label}</span>
                </div>
              ))}
            </div>
          )}
          {doneRevealing && (
            <div className="mt-5 animate-fadeUp">
              <div className={`rounded-xl px-4 py-3 text-sm border ${allPass ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-danger/10 border-danger/30 text-danger'}`}>
                {allPass ? `✓ Charger verified ${precheck.verifiedMinAgo <= 1 ? 'just now' : `${precheck.verifiedMinAgo} minutes ago`}. Payment handshake ready.` : 'This charger did not pass verification. We recommend choosing another charger — your payment would be protected either way.'}
              </div>
              <div className="flex gap-2 mt-4">
                <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
                <button className="btn-primary flex-1" onClick={() => setStep('amount')} disabled={!allPass}>Continue to Payment</button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'amount' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-card2 border border-line p-3 flex items-center gap-3 text-sm">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sub">Amount is <b className="text-ink">authorized, not captured</b>. You are billed only for delivered energy; unused amount is released automatically.</span>
          </div>
          <div>
            <div className="label">Charging amount (authorization)</div>
            <div className="grid grid-cols-4 gap-2">
              {[200, 300, 500, 1000].map(a => (
                <button key={a} onClick={() => setAmount(a)} className={`btn !py-3 border ${amount === a ? 'bg-primary text-bg border-primary font-extrabold' : 'bg-card2 border-line text-sub hover:border-slate-500'}`}>₹{a}</button>
              ))}
            </div>
            <div className="text-xs text-sub mt-2">≈ {(amount / charger.pricePerKwh).toFixed(1)} kWh at ₹{charger.pricePerKwh}/kWh</div>
          </div>
          {vehicles.length > 0 && (
            <div>
              <div className="label">Vehicle</div>
              <select className="input" value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} · {v.connector} · {v.batteryPct}%</option>)}
              </select>
              {vehicles.find(v => v.id === vehicleId)?.connector !== charger.connector && (
                <div className="text-xs text-warn mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> This vehicle uses a different connector than {charger.connector}.</div>
              )}
            </div>
          )}
          <div>
            <div className="label">Payment method (sandbox)</div>
            <div className="grid grid-cols-3 gap-2">
              {['UPI', 'Card', 'Wallet'].map(m => (
                <button key={m} onClick={() => setMethod(m)} className={`btn !py-2.5 !text-xs border ${method === m ? 'bg-primary/15 text-primary border-primary/50' : 'bg-card2 border-line text-sub'}`}>{m}</button>
              ))}
            </div>
          </div>
          <button className="btn-primary w-full !py-3.5" onClick={authorize}><Zap className="w-4 h-4" /> Authorize {fmtINR(amount, 0)} & Start</button>
        </div>
      )}

      {(step === 'paying' || step === 'handshake') && (
        <div className="py-8 text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-4 border-line" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <Zap className="absolute inset-0 m-auto w-8 h-8 text-primary fill-primary" />
          </div>
          <div className="font-bold">{step === 'paying' ? `Authorizing ${fmtINR(amount, 0)}…` : 'Charger handshake in progress…'}</div>
          <div className="text-sm text-sub mt-1">{step === 'paying' ? `${method} · Razorpay sandbox — no real money moves` : 'Verifying connector lock, relay and comm link'}</div>
          <div className="flex justify-center gap-2 mt-5 text-xs font-mono">
            <span className="chip text-primary bg-primary/10 border-primary/30">AUTHORIZED</span>
            <span className="text-slate-600">→</span>
            <span className={`chip ${step === 'handshake' ? 'text-cyan-300 bg-cyan-400/10 border-cyan-400/30' : 'text-sub bg-card2 border-line'}`}>CHARGER_CHECK</span>
            <span className="text-slate-600">→</span>
            <span className="chip text-sub bg-card2 border-line">STARTED</span>
          </div>
        </div>
      )}

      {step === 'failed' && failInfo && (
        <div className="animate-fadeUp">
          <div className="rounded-2xl bg-danger/10 border border-danger/30 p-5 text-center mb-4">
            <XCircle className="w-10 h-10 text-danger mx-auto mb-2" />
            <div className="font-extrabold text-danger text-lg">CHARGER HANDSHAKE FAILED</div>
            <div className="text-sm text-sub mt-1">Charging not started. No energy was delivered.</div>
          </div>
          <div className="space-y-2 text-sm">
            {[['Payment status', <span className="font-bold text-warn">PROTECTED / PENDING RESOLUTION</span>],
              ['Amount', <b>{fmtINR(failInfo.payment.amountAuthorized)}</b>],
              ['Transaction', <span className="font-mono text-xs">{failInfo.payment.id}</span>],
              ['Refund / adjustment', <span className="font-bold text-primary">INITIATED — {failInfo.refund?.id}</span>],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-2 border-b border-line last:border-0"><span className="text-sub">{k}</span>{v}</div>
            ))}
          </div>
          <p className="text-xs text-sub mt-3">Your money was never captured. The authorization hold is being released — track every step in the Refund Center. This transaction stays in your history permanently.</p>
          <div className="flex gap-2 mt-4">
            <button className="btn-ghost flex-1" onClick={onClose}>Close</button>
            <Link to="/refunds" className="btn-primary flex-1">Track Refund</Link>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ============ RESERVATION ============ */
function ReserveModal({ station, charger, onClose }) {
  const { toast } = useApp();
  const [form, setForm] = useState({ date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), startTime: '18:30', durationMin: 45 });
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const d = await api('/bookings', { method: 'POST', body: { stationId: station.id, chargerId: charger.id, ...form } });
      setDone(d.booking); toast('Reservation confirmed!');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={done ? 'Reservation confirmed' : `Reserve ${charger.code}`}>
      {done ? (
        <div className="text-center py-4 animate-fadeUp">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
          <div className="text-sm text-sub">Booking ID</div>
          <div className="text-2xl font-black font-mono text-primary">{done.id}</div>
          <StatusBadge status="CONFIRMED" className="mt-3" />
          <div className="text-sm text-sub mt-4">{station.name} · {charger.code} ({charger.connector}, {charger.powerKw} kW)<br />{done.date} at {done.startTime} · {done.durationMin} min</div>
          <Link to="/booking" className="btn-primary w-full mt-5">View My Reservations</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-sub">{station.name} · {charger.connector} · {charger.powerKw} kW · ₹{charger.pricePerKwh}/kWh</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><label className="label">Start time</label><input type="time" className="input" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
          </div>
          <div>
            <label className="label">Expected duration — {form.durationMin} min</label>
            <input type="range" min="15" max="120" step="15" value={form.durationMin} onChange={e => setForm(f => ({ ...f, durationMin: +e.target.value }))} className="w-full accent-[#A3E635]" />
          </div>
          <button className="btn-primary w-full" disabled={busy} onClick={go}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />} Confirm Reservation</button>
        </div>
      )}
    </Modal>
  );
}

/* ============ PAGE ============ */
export default function StationDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { toast, socket } = useApp();
  const [data, setData] = useState(null);
  const [chargeCh, setChargeCh] = useState(null);
  const [reserveCh, setReserveCh] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [fav, setFav] = useState(false);
  const [forecast, setForecast] = useState(null);

  const load = () => api(`/stations/${id}`).then(setData).catch(e => toast(e.message, 'error'));
  useEffect(() => {
    load();
    api('/favorites').then(d => setFav(d.stations.some(s => s.id === id))).catch(() => {});
    api(`/stations/${id}/forecast`).then(setForecast).catch(() => {});
  }, [id]);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    const h = (d) => { if (d.stationId === id) load(); };
    s.on('charger:update', h);
    return () => s.off('charger:update', h);
  }, [socket, id]);
  const reserveHandled = React.useRef(false);
  useEffect(() => {
    if (data && sp.get('reserve') && !reserveHandled.current) {
      reserveHandled.current = true;
      const c = data.station.chargers.find(x => x.status === 'AVAILABLE');
      if (c) setReserveCh(c);
    }
  }, [data]);

  if (!data) return <Spinner label="Loading station…" />;
  const s = data.station;

  const toggleFav = async () => {
    const r = await api(`/favorites/${s.id}`, { method: 'POST' });
    setFav(r.favorited); toast(r.favorited ? 'Added to favorites' : 'Removed from favorites', 'info');
  };

  return (
    <div className="space-y-4">
      <button onClick={() => nav(-1)} className="btn-ghost !py-1.5 !px-3 !text-xs"><ChevronLeft className="w-3.5 h-3.5" /> Back</button>
      <div className="grid lg:grid-cols-[1fr_400px] gap-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="card p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold flex items-center gap-2">{s.name} {s.verified && <BadgeCheck className="w-5 h-5 text-primary" title="ChargeOne Verified" />}</h1>
                <div className="text-sm text-sub mt-1 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {s.address}</div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                  <span className="chip bg-card2 border-line" style={{ color: s.operatorColor }}>{s.operatorName}</span>
                  <span className="flex items-center gap-1 text-sub"><Star className="w-4 h-4 text-warn fill-warn" />{s.rating} ({s.reviews})</span>
                  <span className="flex items-center gap-1 text-sub"><Clock className="w-4 h-4" />{s.openHours}</span>
                  {s.distanceKm != null && <span className="text-sub">{s.distanceKm} km away</span>}
                </div>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button className="btn-ghost !text-xs" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`, '_blank')}><Navigation className="w-3.5 h-3.5" /> Navigate</button>
              <button className={`btn-ghost !text-xs ${fav ? '!text-danger' : ''}`} onClick={toggleFav}><Heart className={`w-3.5 h-3.5 ${fav ? 'fill-danger' : ''}`} /> {fav ? 'Favorited' : 'Favorite'}</button>
              <Link to={`/support/report?station=${s.id}`} className="btn-ghost !text-xs !text-warn"><AlertTriangle className="w-3.5 h-3.5" /> Report Problem</Link>
            </div>
          </div>

          {/* Chargers */}
          <div className="card p-5 md:p-6">
            <div className="font-bold mb-1">Chargers ({s.counts.total})</div>
            <p className="text-xs text-sub mb-4">{s.counts.available} available · {s.counts.occupied} busy · {s.counts.fault} fault · verified {s.lastVerifiedMin <= 1 ? 'just now' : `${s.lastVerifiedMin} min ago`}</p>
            <div className="space-y-3">
              {s.chargers.map(c => (
                <div key={c.id} className={`rounded-2xl border p-4 transition ${c.status === 'AVAILABLE' ? 'border-primary/25 bg-primary/[0.03]' : 'border-line bg-card2/40'}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <HealthRing score={c.health} size={46} stroke={5} />
                    <div className="flex-1 min-w-[140px]">
                      <div className="font-bold text-sm font-mono">{c.code}</div>
                      <div className="text-xs text-sub">{c.connector} · {c.powerKw} kW · ₹{c.pricePerKwh}/kWh</div>
                      {c.faultCode && <div className="text-[11px] text-danger font-mono mt-0.5">{c.faultCode}</div>}
                    </div>
                    <StatusBadge status={c.status} />
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button className="btn-ghost !py-2 !text-xs flex-1" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>Health</button>
                      <button className="btn-ghost !py-2 !text-xs flex-1" disabled={c.status !== 'AVAILABLE'} onClick={() => setReserveCh(c)}>Reserve</button>
                      <button className="btn-primary !py-2 !text-xs flex-1" disabled={c.status !== 'AVAILABLE'} onClick={() => setChargeCh(c)}><Zap className="w-3.5 h-3.5" /> Charge Now</button>
                    </div>
                  </div>
                  {expanded === c.id && (
                    <div className="mt-4 pt-4 border-t border-line grid md:grid-cols-2 gap-5 animate-fadeUp">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-sub mb-3">Charger health — {c.health}/100</div>
                        <HealthFactors factors={c.healthFactors} />
                      </div>
                      <div className="space-y-2 text-sm">
                        {[[c.status !== 'OFFLINE', 'Online'], [c.status === 'AVAILABLE' || c.status === 'CHARGING', 'Connector detected'], [c.lastSuccessMin < 90, `Recent successful session (${c.lastSuccessMin} min ago)`], [c.health > 50, 'Network connection healthy'], [c.status !== 'OFFLINE' && c.status !== 'FAULT', 'Payment handshake ready']].map(([ok, l]) => (
                          <div key={l} className="flex items-center gap-2">{ok ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <XCircle className="w-4 h-4 text-danger" />}<span className={ok ? '' : 'text-sub'}>{l}</span></div>
                        ))}
                        <div className="text-xs text-sub pt-2">Uptime (30d): <b className="text-ink">{c.uptime30d}%</b> · Sessions today: <b className="text-ink">{c.sessionsToday}</b></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          {data.reviews.length > 0 && (
            <div className="card p-5 md:p-6">
              <div className="font-bold mb-3">Driver reviews</div>
              <div className="space-y-3">
                {data.reviews.map(r => (
                  <div key={r.id} className="rounded-xl bg-card2/50 border border-line p-3">
                    <div className="flex items-center justify-between"><span className="font-semibold text-sm">{r.userName}</span><span className="flex">{[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-warn fill-warn" />)}</span></div>
                    <p className="text-sm text-sub mt-1">{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <MapView stations={[s]} center={[s.lat, s.lng]} zoom={14} height="260px" />
          <div className="card p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-sub mb-3">Station health</div>
            <div className="flex items-center gap-4">
              <HealthRing score={s.health} size={84} stroke={8} />
              <div className="text-sm space-y-1.5">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> ChargeOne monitored</div>
                <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Protected payment flow</div>
                <div className="text-xs text-sub">Composite of all charger health scores at this station.</div>
              </div>
            </div>
          </div>
          {forecast && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold uppercase tracking-widest text-sub flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-primary" /> Availability forecast</div>
                <span className="text-[10px] text-slate-500 font-mono">{forecast.model}</span>
              </div>
              <div className="flex items-end gap-1.5 h-24 mb-2">
                {forecast.points.map(pt => (
                  <div key={pt.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full rounded-t-md transition-all duration-500" style={{
                      height: `${Math.max(8, pt.availabilityPct * 0.8)}%`,
                      background: pt.band === 'HIGH' ? '#A3E635' : pt.band === 'MEDIUM' ? '#F59E0B' : '#EF4444',
                      opacity: 0.9,
                    }} title={`${pt.hour}: ${pt.availabilityPct}% free (${pt.predictedFree} chargers)${pt.expectedWaitMin ? `, ~${pt.expectedWaitMin} min wait` : ''}`} />
                    <span className="text-[8px] text-sub font-semibold">{pt.hour.slice(0, 2)}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-primary/10 border border-primary/25 px-3 py-2 text-xs">
                <b className="text-primary">Best time to charge: {forecast.bestWindow}</b>
                <span className="text-sub"> — predicted {forecast.bestAvailabilityPct}% availability</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Predicted from historical utilization, live occupancy and demand curves. Confidence {(forecast.confidence * 100).toFixed(0)}%.</p>
            </div>
          )}
          <div className="card p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-sub mb-3">Facilities</div>
            <div className="flex flex-wrap gap-2">
              {s.facilities.map(f => <span key={f} className="chip text-sub bg-card2 border-line">{f}</span>)}
            </div>
          </div>
          <div className="card p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-sub mb-2">Tariff</div>
            <div className="text-3xl font-black text-primary">₹{s.pricePerKwh}<span className="text-sm text-sub font-medium">/kWh</span></div>
            <div className="text-xs text-sub mt-1">Set by {s.operatorName}. Includes GST. Idle fees may apply after 10 min post-charge.</div>
          </div>
        </div>
      </div>

      {chargeCh && <ChargeFlow charger={chargeCh} station={s} onClose={() => setChargeCh(null)} />}
      {reserveCh && <ReserveModal station={s} charger={reserveCh} onClose={() => setReserveCh(null)} />}
    </div>
  );
}
