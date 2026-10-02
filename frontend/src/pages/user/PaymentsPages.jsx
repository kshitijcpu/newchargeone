import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ReceiptText, RotateCcw, ChevronRight, ShieldCheck } from 'lucide-react';
import { StatusBadge, PageHead, SkeletonRows, EmptyState, Timeline, Spinner, Modal } from '../../components/ui';
import { api, fmtINR, fmtDate, fmtDateTime, meta } from '../../lib/api';
import { useApp } from '../../context/AppContext';

/* ---------- PAYMENTS LIST ---------- */
export function Payments() {
  const [payments, setPayments] = useState(null);
  const { socket } = useApp();
  const load = () => api('/payments').then(d => setPayments(d.payments)).catch(() => setPayments([]));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    s.on('payment:update', load);
    return () => s.off('payment:update', load);
  }, [socket]);

  return (
    <div>
      <PageHead title="Payments" sub="Complete transaction lifecycle for every charge — authorization to settlement" />
      {!payments ? <SkeletonRows n={5} /> : payments.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No payments yet" sub="Transactions appear here the moment you authorize a charge." />
      ) : (
        <div className="space-y-3">
          {payments.map(p => (
            <Link key={p.id} to={`/payments/${p.id}`} className="card card-hover p-4 flex items-center gap-4 block">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{p.id}</span>
                  <StatusBadge status={p.status} />
                </div>
                <div className="text-sm font-semibold mt-1 truncate">{p.stationName} · {p.chargerCode}</div>
                <div className="text-xs text-sub">{fmtDateTime(p.createdAt)} · {p.method} · {p.provider}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-extrabold">{fmtINR(p.amountFinal || p.amountAuthorized)}</div>
                <div className="text-[10px] text-sub">auth {fmtINR(p.amountAuthorized, 0)}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-sub" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- TRANSACTION DETAILS ---------- */
export function TransactionDetail() {
  const { paymentId } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const { socket } = useApp();
  const load = () => api(`/payments/${paymentId}`).then(setD).catch(() => {});
  useEffect(() => { load(); }, [paymentId]);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    const h = (u) => { if (u.id === paymentId) load(); };
    s.on('payment:update', h);
    return () => s.off('payment:update', h);
  }, [socket, paymentId]);

  if (!d) return <Spinner label="Loading transaction…" />;
  const { payment: p, session: sess, refunds } = d;

  const steps = p.timeline.map((t, i) => ({
    title: meta(t.state).label + (t.state === p.timeline[p.timeline.length - 1].state && i === p.timeline.length - 1 ? '' : ''),
    sub: `${t.note} · ${fmtDateTime(t.at)}`,
    done: !['FAILED'].includes(t.state),
    failed: t.state === 'FAILED',
  }));

  const rows = [
    ['Transaction ID', p.id], ['Payment ID', `pay_${p.id.replace(/-/g, '').slice(-10)}`],
    ['Booking ID', sess?.id || '—'], ['Station', p.stationName], ['Operator', p.operatorName],
    ['Charger', p.chargerCode], ['Connector', p.connector],
    ['Start time', sess ? fmtDateTime(sess.startTime) : '—'], ['End time', sess?.endTime ? fmtDateTime(sess.endTime) : '—'],
    ['Energy consumed', sess?.energyKwh ? `${(+sess.energyKwh).toFixed(2)} kWh` : '0 kWh'],
    ['Price per kWh', sess ? `₹${sess.pricePerKwh}` : '—'], ['Taxes (GST incl.)', fmtINR(p.taxes)],
    ['Estimated / authorized', fmtINR(p.amountAuthorized)], ['Final amount', fmtINR(p.amountFinal)],
    ['Released / adjusted', fmtINR(p.amountReleased)],
    ['Payment method', `${p.method} · ${p.provider}`],
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <button onClick={() => nav(-1)} className="btn-ghost !py-1.5 !px-3 !text-xs"><ChevronLeft className="w-3.5 h-3.5" /> Back</button>
      <div className="card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-sm font-bold text-primary">{p.id}</div>
            <h1 className="text-xl font-extrabold mt-1">{p.stationName}</h1>
            <div className="text-sm text-sub">{fmtDateTime(p.createdAt)}</div>
          </div>
          <div className="text-right">
            <StatusBadge status={p.status} />
            <div className="text-2xl font-black mt-2">{fmtINR(p.amountFinal || p.amountAuthorized)}</div>
          </div>
        </div>
        {['FAILED', 'REFUND_PENDING', 'REFUND_PROCESSING', 'REFUNDED'].includes(p.status) && (
          <div className="mt-4 rounded-xl bg-danger/10 border border-danger/30 p-3 flex items-start gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <span><b>Payment protected.</b> Charging {sess?.energyKwh ? 'was interrupted' : 'never started'} — the {p.status === 'REFUNDED' ? 'amount was released to your source account' : 'reversal is in progress'}. Track it in the <Link to="/refunds" className="text-primary font-semibold underline">Refund Center</Link>.</span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5 md:p-6">
          <div className="font-bold mb-4">Transaction timeline</div>
          <Timeline steps={steps} />
        </div>
        <div className="card p-5 md:p-6">
          <div className="font-bold mb-4">Details</div>
          <div className="space-y-0 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2 border-b border-line last:border-0">
                <span className="text-sub">{k}</span><span className="font-semibold text-right">{v}</span>
              </div>
            ))}
          </div>
          {refunds.length > 0 && (
            <div className="mt-4 pt-4 border-t border-line">
              <div className="text-xs font-bold uppercase tracking-wider text-sub mb-2">Linked refunds</div>
              {refunds.map(r => (
                <Link key={r.id} to="/refunds" className="flex items-center justify-between py-2 text-sm hover:text-primary">
                  <span className="font-mono text-xs">{r.id}</span>
                  <span className="flex items-center gap-2">{fmtINR(r.amount)} <StatusBadge status={r.status} /></span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- REFUND CENTER ---------- */
export function Refunds() {
  const [refunds, setRefunds] = useState(null);
  const [sel, setSel] = useState(null);
  const { socket } = useApp();
  const load = () => api('/refunds').then(d => setRefunds(d.refunds)).catch(() => setRefunds([]));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const s = socket.current; if (!s) return;
    s.on('refund:update', load);
    return () => s.off('refund:update', load);
  }, [socket]);

  return (
    <div>
      <PageHead title="Refund Center" sub="Every reversal and adjustment, tracked step by step — no black holes" />
      <div className="card p-4 mb-5 flex items-start gap-3 text-sm border-primary/20">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <span className="text-sub">When a charger fails before energy delivery, ChargeOne automatically initiates the reversal workflow with the payment provider. Settlement timing depends on the provider and your bank — but you always see exactly which step is pending.</span>
      </div>
      {!refunds ? <SkeletonRows n={4} /> : refunds.length === 0 ? (
        <EmptyState icon={RotateCcw} title="No refunds or adjustments" sub="That's a good thing — all your sessions completed cleanly." />
      ) : (
        <div className="space-y-3">
          {refunds.map(r => (
            <button key={r.id} onClick={() => setSel(r)} className="card card-hover p-4 w-full text-left flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0"><RotateCcw className="w-5 h-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{r.id}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-sm font-semibold mt-0.5 truncate">{r.reason}</div>
                <div className="text-xs text-sub">{r.stationName} · created {fmtDate(r.createdAt)} · updated {fmtDate(r.updatedAt)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-extrabold text-primary">{fmtINR(r.amount)}</div>
                <div className="text-[10px] text-sub">{r.type === 'FULL_REVERSAL' ? 'Full reversal' : r.type === 'PARTIAL_RELEASE' ? 'Unused amount' : 'Manual review'}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!sel} onClose={() => setSel(null)} title="Refund timeline">
        {sel && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-sm font-bold text-primary">{sel.id}</span>
              <StatusBadge status={sel.status} />
            </div>
            <div className="text-2xl font-black mb-1">{fmtINR(sel.amount)}</div>
            <div className="text-sm text-sub mb-5">{sel.reason} · <Link to={`/payments/${sel.paymentId}`} className="text-primary underline">view transaction</Link></div>
            <Timeline steps={sel.timeline.map(t => ({ title: t.step, sub: t.at ? fmtDateTime(t.at) : 'Pending', done: t.done }))} />
            <p className="text-xs text-slate-500 mt-4">Settlement timelines depend on the payment provider and receiving bank. ChargeOne cannot force instant bank credit, but tracks and escalates every step.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
