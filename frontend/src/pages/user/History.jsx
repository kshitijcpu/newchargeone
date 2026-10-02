import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ChevronRight, History as HistIcon } from 'lucide-react';
import { StatusBadge, PageHead, SkeletonRows, EmptyState } from '../../components/ui';
import { api, fmtINR, fmtDate } from '../../lib/api';

export default function History() {
  const [sessions, setSessions] = useState(null);
  useEffect(() => { api('/history').then(d => setSessions(d.sessions.filter(s => !s.live))).catch(() => setSessions([])); }, []);

  const totalKwh = sessions?.reduce((a, s) => a + (s.energyKwh || 0), 0) || 0;
  const totalSpent = sessions?.reduce((a, s) => a + (s.finalAmount || 0), 0) || 0;

  return (
    <div>
      <PageHead title="Charging history" sub="Every session across every network — nothing is ever hidden or deleted" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[['Sessions', sessions?.length ?? '—'], ['Energy', `${totalKwh.toFixed(1)} kWh`], ['Total spent', fmtINR(totalSpent)]].map(([l, v]) => (
          <div key={l} className="card p-4 text-center"><div className="text-lg md:text-2xl font-black text-primary">{v}</div><div className="text-[10px] md:text-xs text-sub font-semibold uppercase tracking-wider mt-0.5">{l}</div></div>
        ))}
      </div>
      {!sessions ? <SkeletonRows n={5} /> : sessions.length === 0 ? (
        <EmptyState icon={HistIcon} title="No charging sessions yet" sub="Your full transaction lifecycle will appear here after your first charge." action={<Link to="/app/stations" className="btn-primary">Find a Charger</Link>} />
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <Link key={s.id} to={`/history/${s.paymentId}`} className="card card-hover p-4 flex items-center gap-4 block">
              <div className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center border ${s.status === 'COMPLETED' ? 'bg-primary/10 border-primary/25' : 'bg-danger/10 border-danger/25'}`}>
                <Zap className={`w-5 h-5 ${s.status === 'COMPLETED' ? 'text-primary' : 'text-danger'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm truncate">{s.stationName}</span>
                  <StatusBadge status={s.status} />
                </div>
                <div className="text-xs text-sub mt-0.5">
                  {fmtDate(s.startTime)} · {s.energyKwh ? `${s.energyKwh.toFixed(1)} kWh · ${s.durationMin} min` : 'Session failed — refund initiated'} · {s.connector}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-extrabold">{s.status === 'COMPLETED' ? fmtINR(s.finalAmount) : fmtINR(s.estimatedAmount)}</div>
                <div className="text-[10px] text-sub">{s.status === 'COMPLETED' ? `auth ${fmtINR(s.estimatedAmount, 0)}` : 'protected'}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-sub shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
