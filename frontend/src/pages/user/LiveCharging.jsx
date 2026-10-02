import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Zap, StopCircle, Gauge, BatteryCharging, Timer, IndianRupee, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Spinner, Confirm, StatusBadge } from '../../components/ui';
import { api, fmtINR, fmtDur } from '../../lib/api';
import { useApp } from '../../context/AppContext';

function BigRing({ pct, live }) {
  const size = 260, stroke = 16, r = (size - stroke) / 2, C = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="ring-track" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" stroke={live ? '#A3E635' : '#64748B'} strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} className="ring-val" style={{ filter: live ? 'drop-shadow(0 0 12px rgba(163,230,53,.5))' : 'none' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Zap className={`w-8 h-8 text-primary fill-primary mb-1 ${live ? 'bolt-anim' : ''}`} />
        <div className="text-5xl font-black tracking-tight">{Math.round(pct)}<span className="text-2xl text-sub">%</span></div>
        <div className="text-xs text-sub font-semibold mt-1">{live ? 'CHARGING' : 'SESSION ENDED'}</div>
      </div>
    </div>
  );
}

export default function LiveCharging() {
  const { sessionId } = useParams();
  const { socket, toast } = useApp();
  const [s, setS] = useState(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => { api(`/sessions/${sessionId}`).then(d => setS({ ...d.session })).catch(e => toast(e.message, 'error')); }, [sessionId]);
  useEffect(() => {
    const sock = socket.current; if (!sock) return;
    const h = (d) => { if (d.id === sessionId) setS(prev => ({ ...prev, ...d })); };
    sock.on('session:update', h);
    return () => sock.off('session:update', h);
  }, [socket, sessionId]);

  if (!s) return <Spinner label="Connecting to charger…" />;
  const live = s.live;

  const stop = async () => {
    try { const d = await api(`/sessions/${sessionId}/stop`, { method: 'POST' }); setS(prev => ({ ...prev, ...d.session })); toast('Charging stopped — settling payment'); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold">Charging session</h1>
          <div className="text-xs text-sub font-mono mt-0.5">{s.id}</div>
        </div>
        <StatusBadge status={live ? 'CHARGING' : s.status} />
      </div>

      <div className={`card p-6 md:p-8 relative overflow-hidden ${live ? 'border-primary/30' : ''}`}>
        {live && <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(400px 200px at 50% 0%, rgba(163,230,53,0.07), transparent)' }} />}
        <BigRing pct={s.pct} live={live} />
        <div className="h-2 rounded-full bg-card2 overflow-hidden mt-6 max-w-md mx-auto">
          <div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-700" style={{ width: `${s.pct}%` }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-7">
          {[[Gauge, 'Power', `${s.powerNow || 0} kW`], [BatteryCharging, 'Energy', `${(s.energyKwh || 0).toFixed(1)} kWh`], [Timer, 'Duration', fmtDur(s.seconds || 0)], [IndianRupee, 'Est. cost', fmtINR(s.estimatedCost)]].map(([I, l, v]) => (
            <div key={l} className="rounded-2xl bg-card2/60 border border-line p-3.5 text-center">
              <I className="w-4 h-4 text-primary mx-auto mb-1.5" />
              <div className="text-lg font-extrabold tabular-nums">{v}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-sub">{l}</div>
            </div>
          ))}
        </div>
        {live && (
          <div className="grid grid-cols-2 gap-3 mt-3 max-w-md mx-auto text-center text-xs text-sub">
            <div className="rounded-xl bg-card2/40 border border-line py-2">Voltage <b className="text-ink tabular-nums">{s.voltage} V</b></div>
            <div className="rounded-xl bg-card2/40 border border-line py-2">Current <b className="text-ink tabular-nums">{s.current} A</b></div>
          </div>
        )}
        <div className="flex items-center justify-center gap-2 mt-5 text-xs text-sub">
          <MapPin className="w-3.5 h-3.5" /> {s.stationName} · {s.chargerCode} · {s.connector} / {s.powerKw} kW · ₹{s.pricePerKwh}/kWh
        </div>
        {live ? (
          <button className="btn-danger w-full max-w-md mx-auto mt-6 !py-3.5 flex" onClick={() => setConfirm(true)}><StopCircle className="w-5 h-5" /> STOP CHARGING</button>
        ) : (
          <div className="max-w-md mx-auto mt-6 animate-fadeUp">
            <div className={`rounded-2xl border p-4 text-center ${s.status === 'COMPLETED' ? 'bg-primary/10 border-primary/30' : 'bg-danger/10 border-danger/30'}`}>
              {s.status === 'COMPLETED' ? <CheckCircle2 className="w-7 h-7 text-primary mx-auto mb-1" /> : <AlertTriangle className="w-7 h-7 text-danger mx-auto mb-1" />}
              <div className="font-bold">{s.status === 'COMPLETED' ? 'Charging complete' : 'Charging session interrupted'}</div>
              <div className="grid grid-cols-2 gap-3 mt-4 text-left">
                <div className="rounded-xl bg-bg/60 p-3"><div className="text-lg font-black">{fmtINR(s.finalAmount)}</div><div className="text-[10px] text-sub uppercase font-semibold">Final charging amount</div></div>
                <div className="rounded-xl bg-bg/60 p-3"><div className="text-lg font-black text-primary">{fmtINR(Math.max(0, (s.estimatedAmount || 0) - (s.finalAmount || 0)))}</div><div className="text-[10px] text-sub uppercase font-semibold">Adjustment / release</div></div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Link to={`/history/${s.paymentId}`} className="btn-ghost flex-1">Transaction Details</Link>
              <Link to="/refunds" className="btn-primary flex-1">Refund Center</Link>
            </div>
          </div>
        )}
      </div>

      <div className="card p-4 text-xs text-sub flex items-start gap-2">
        <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        You authorized {fmtINR(s.estimatedAmount, 0)}. Only the value of delivered energy is captured when the session ends — the remainder is released automatically. Live values stream over WebSocket from station telemetry (simulated, ~12× accelerated for demo).
      </div>

      <Confirm open={confirm} onClose={() => setConfirm(false)} onConfirm={stop} danger title="Stop charging?" body="The session will end now. You will only be charged for the energy delivered so far; the unused authorized amount is released automatically." confirmLabel="Stop Charging" />
    </div>
  );
}
