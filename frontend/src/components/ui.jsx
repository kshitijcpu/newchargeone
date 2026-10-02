import React, { useEffect, useState } from 'react';
import { Zap, CheckCircle2, XCircle, AlertTriangle, Info, X, Inbox, Loader2 } from 'lucide-react';
import { meta } from '../lib/api';
import { useApp } from '../context/AppContext';

export const Logo = ({ size = 'md' }) => (
  <div className="flex items-center gap-2 select-none">
    <div className={`${size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'} rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-glow`}>
      <Zap className={`${size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} text-primary fill-primary`} />
    </div>
    <div className={`font-extrabold tracking-tight ${size === 'lg' ? 'text-xl' : 'text-lg'}`}>
      Charge<span className="text-primary">One</span>
    </div>
  </div>
);

export const StatusBadge = ({ status, className = '' }) => {
  const m = meta(status);
  return (
    <span className={`chip ${m.cls} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulseDot" style={{ background: m.color }} />
      {m.label}
    </span>
  );
};

export const StatCard = ({ icon: Icon, label, value, sub, tone = 'default', className = '' }) => (
  <div className={`card p-4 md:p-5 animate-fadeUp ${className}`}>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wider text-sub truncate">{label}</div>
        <div className={`stat-num mt-1.5 ${tone === 'primary' ? 'text-primary' : tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : ''}`}>{value}</div>
        {sub && <div className="text-xs text-sub mt-1 truncate">{sub}</div>}
      </div>
      {Icon && <div className="w-9 h-9 shrink-0 rounded-xl bg-card2 border border-line flex items-center justify-center"><Icon className="w-4.5 h-4.5 w-4 h-4 text-primary" /></div>}
    </div>
  </div>
);

export const HealthRing = ({ score = 0, size = 72, stroke = 7, showLabel = true }) => {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r;
  const [off, setOff] = useState(C);
  useEffect(() => { const t = setTimeout(() => setOff(C * (1 - score / 100)), 60); return () => clearTimeout(t); }, [score, C]);
  const color = score >= 80 ? '#A3E635' : score >= 55 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="ring-track" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" stroke={color} strokeDasharray={C} strokeDashoffset={off} className="ring-val" />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-extrabold" style={{ color, fontSize: size / 3.4 }}>{score}</span>
          {size > 60 && <span className="text-[9px] text-sub font-semibold -mt-0.5">/100</span>}
        </div>
      )}
    </div>
  );
};

export const HealthFactors = ({ factors }) => {
  const rows = [
    ['Successful sessions', factors?.successfulSessions, '40%'],
    ['Recent availability', factors?.recentAvailability, '20%'],
    ['Communication uptime', factors?.commUptime, '15%'],
    ['Fault frequency', factors?.faultFrequency, '15%'],
    ['User reports', factors?.userReports, '10%'],
  ];
  return (
    <div className="space-y-2.5">
      {rows.map(([label, v, w]) => (
        <div key={label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-sub">{label} <span className="text-slate-600">· weight {w}</span></span>
            <span className="font-semibold">{Math.max(0, Math.min(100, v ?? 0))}</span>
          </div>
          <div className="h-1.5 rounded-full bg-card2 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, v ?? 0))}%`, background: (v ?? 0) >= 80 ? '#A3E635' : (v ?? 0) >= 55 ? '#F59E0B' : '#EF4444' }} />
          </div>
        </div>
      ))}
      <p className="text-[10px] text-slate-500 pt-1">Informational reliability indicator computed by ChargeOne from operational telemetry. Not an industry certification.</p>
    </div>
  );
};

export const Timeline = ({ steps }) => (
  <div className="relative">
    {steps.map((s, i) => (
      <div key={i} className="flex gap-3 pb-5 last:pb-0 relative">
        {i < steps.length - 1 && <div className={`absolute left-[11px] top-6 bottom-0 w-px ${s.done ? 'bg-primary/40' : 'bg-line'}`} />}
        <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center border ${s.done ? 'bg-primary/15 border-primary/50' : s.failed ? 'bg-danger/15 border-danger/50' : 'bg-card2 border-line'}`}>
          {s.done ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> : s.failed ? <XCircle className="w-3.5 h-3.5 text-danger" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
        </div>
        <div className="min-w-0 -mt-0.5">
          <div className={`text-sm font-semibold ${s.done ? '' : s.failed ? 'text-danger' : 'text-sub'}`}>{s.title}</div>
          {s.sub && <div className="text-xs text-sub mt-0.5">{s.sub}</div>}
        </div>
      </div>
    ))}
  </div>
);

export const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center p-0 md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className={`relative card w-full ${wide ? 'md:max-w-2xl' : 'md:max-w-md'} max-h-[90vh] overflow-y-auto p-5 md:p-6 rounded-b-none md:rounded-2xl animate-fadeUp`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-card2 border border-line flex items-center justify-center hover:border-slate-500"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const Confirm = ({ open, onClose, onConfirm, title, body, confirmLabel = 'Confirm', danger }) => (
  <Modal open={open} onClose={onClose} title={title}>
    <p className="text-sm text-sub mb-5">{body}</p>
    <div className="flex gap-2 justify-end">
      <button className="btn-ghost" onClick={onClose}>Cancel</button>
      <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
    </div>
  </Modal>
);

export const Toasts = () => {
  const { toasts } = useApp();
  const icons = { success: CheckCircle2, error: XCircle, warn: AlertTriangle, info: Info };
  const colors = { success: 'border-primary/40 text-primary', error: 'border-danger/40 text-danger', warn: 'border-warn/40 text-warn', info: 'border-cyan-400/40 text-cyan-300' };
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[1000] space-y-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map(t => {
        const I = icons[t.type] || Info;
        return (
          <div key={t.id} className={`card px-4 py-3 flex items-start gap-3 animate-fadeUp border ${colors[t.type] || colors.info}`}>
            <I className="w-4.5 h-4.5 w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-sm text-ink font-medium">{t.msg}</div>
          </div>
        );
      })}
    </div>
  );
};

export const EmptyState = ({ icon: Icon = Inbox, title, sub, action }) => (
  <div className="card p-10 flex flex-col items-center text-center animate-fadeUp">
    <div className="w-14 h-14 rounded-2xl bg-card2 border border-line flex items-center justify-center mb-4"><Icon className="w-6 h-6 text-sub" /></div>
    <div className="font-bold">{title}</div>
    {sub && <div className="text-sm text-sub mt-1 max-w-sm">{sub}</div>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-sub">
    <Loader2 className="w-5 h-5 animate-spin text-primary" /> <span className="text-sm">{label}</span>
  </div>
);

export const SkeletonRows = ({ n = 4, h = 'h-20' }) => (
  <div className="space-y-3">{[...Array(n)].map((_, i) => <div key={i} className={`skeleton ${h}`} />)}</div>
);

export const PageHead = ({ title, sub, right }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
    <div>
      <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">{title}</h1>
      {sub && <p className="text-sm text-sub mt-1">{sub}</p>}
    </div>
    {right}
  </div>
);
