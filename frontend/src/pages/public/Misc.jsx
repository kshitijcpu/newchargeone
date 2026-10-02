import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Gauge, CreditCard, PlugZap, Activity, RotateCcw, CheckCircle2, Building2, BarChart3, Bell, Zap, Mail, Phone, MessageSquare, ShieldCheck } from 'lucide-react';

const Page = ({ kicker, title, sub, children }) => (
  <div className="max-w-7xl mx-auto px-4 py-14 md:py-20">
    <div className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">{kicker}</div>
    <h1 className="text-3xl md:text-5xl font-black tracking-tight max-w-3xl">{title}</h1>
    {sub && <p className="text-sub mt-4 max-w-2xl leading-relaxed">{sub}</p>}
    <div className="mt-12">{children}</div>
  </div>
);

export function HowItWorks() {
  const steps = [
    [MapPin, 'Discover', 'Search supported chargers across participating networks. Filter by connector, speed, price, facilities and reliability.'],
    [Gauge, 'Verify before you drive', 'Every charger carries a live health score built from successful sessions, availability, comm uptime, faults and user reports.'],
    [CreditCard, 'Authorize, not pay blindly', 'Where the provider supports it, your amount is authorized (held) — captured only after energy is actually delivered.'],
    [PlugZap, 'Pre-check & handshake', 'Before any money is captured, ChargeOne re-verifies: station online, connector free, network healthy, payment gateway ready.'],
    [Activity, 'Charge with live telemetry', 'Watch power, energy, battery % and running cost in real time. Stop anytime.'],
    [RotateCcw, 'Transparent settlement', 'Final amount is calculated from delivered energy. Unused authorization is released. Every state is logged and visible.'],
  ];
  const states = ['CREATED', 'INITIATED', 'AUTHORIZED', 'CHARGER_CHECK', 'STARTED', 'CHARGING', 'COMPLETED', 'SETTLED'];
  const fail = ['CHARGER_CHECK', 'FAILED', 'REFUND_PENDING', 'REFUND_PROCESSING', 'REFUNDED'];
  return (
    <Page kicker="How It Works" title="Verification-first charging, transparency-first payments." sub="ChargeOne is designed around one principle: you should always know whether a charger works, and exactly where your money is.">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map(([I, t, b], i) => (
          <div key={t} className="card card-hover p-6 relative">
            <div className="text-[11px] font-black text-primary/50 absolute top-4 right-5">STEP 0{i + 1}</div>
            <I className="w-6 h-6 text-primary mb-4" />
            <div className="font-bold">{t}</div>
            <p className="text-sm text-sub mt-2 leading-relaxed">{b}</p>
          </div>
        ))}
      </div>
      <div className="card p-6 md:p-8 mt-10">
        <div className="font-bold mb-1">The payment state machine</div>
        <p className="text-sm text-sub mb-5">Every transaction moves through explicit states. Every transition is written to an audit log. Nothing is ever silently deleted.</p>
        <div className="flex flex-wrap items-center gap-2">
          {states.map((s, i) => (
            <React.Fragment key={s}>
              <span className="chip text-primary bg-primary/10 border-primary/30 font-mono">{s}</span>
              {i < states.length - 1 && <span className="text-slate-600">→</span>}
            </React.Fragment>
          ))}
        </div>
        <div className="text-xs text-sub mt-5 mb-2 font-semibold uppercase tracking-wider">Failure path (payment protected)</div>
        <div className="flex flex-wrap items-center gap-2">
          {fail.map((s, i) => (
            <React.Fragment key={s}>
              <span className={`chip font-mono ${i === 0 ? 'text-sub bg-slate-500/10 border-slate-500/30' : 'text-danger bg-danger/10 border-danger/30'}`}>{s}</span>
              {i < fail.length - 1 && <span className="text-slate-600">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="text-center mt-10"><Link to="/register" className="btn-primary !px-8 !py-3.5">Start Charging Smarter</Link></div>
    </Page>
  );
}

export function Networks() {
  const nets = [
    ['Tata Power EZ Charge', 'Pan-India', 412, '#3B82F6'], ['Statiq', 'North & West', 246, '#8B5CF6'],
    ['ChargeZone', 'Highways & Metro', 188, '#F59E0B'], ['Ather Grid', 'South India', 152, '#22D3EE'],
    ['Jio-bp Pulse', 'Pan-India', 174, '#10B981'], ['Zeon Charging', 'South Highways', 76, '#EC4899'],
  ];
  return (
    <Page kicker="Participating Networks" title="One account. 27 participating networks." sub="ChargeOne is an independent aggregation platform — stations remain owned and operated by their networks. Coverage grows as operators integrate through OCPI/OCPP-compatible interfaces. Figures below are demo data.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {nets.map(([name, region, count, color]) => (
          <div key={name} className="card card-hover p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-bg text-lg" style={{ background: color }}>{name[0]}</div>
            <div className="min-w-0">
              <div className="font-bold truncate">{name}</div>
              <div className="text-xs text-sub">{region} · {count} supported stations</div>
              <span className="chip text-primary bg-primary/10 border-primary/30 mt-1.5">Integrated</span>
            </div>
          </div>
        ))}
      </div>
      <div className="card p-6 mt-8 border-primary/20">
        <div className="font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Operate a charging network?</div>
        <p className="text-sm text-sub mt-2">Integrate once via OCPI/OCPP-compatible APIs and reach every ChargeOne driver — with fault alerting, utilization analytics and dispute tooling included.</p>
        <Link to="/business" className="btn-ghost mt-4">Partner with ChargeOne</Link>
      </div>
    </Page>
  );
}

export function Pricing() {
  return (
    <Page kicker="Pricing" title="Simple for drivers. Fair for networks." sub="You pay the operator's charger tariff. ChargeOne adds transparency, protection and support on top.">
      <div className="grid md:grid-cols-3 gap-4">
        {[
          ['Drive Free', '₹0', 'forever', ['Multi-network discovery & live status', 'Charger health scores', 'Protected payment flow', 'Refund Center & full history', 'Fault reporting'], 'Get Started', false],
          ['Drive Plus', '₹99', 'per month', ['Everything in Free', 'Priority support resolution', 'Route planner with live re-planning', 'Reservation priority windows', 'Charging analytics for your vehicle'], 'Start 14-day Trial', true],
          ['Fleet', 'Custom', 'per fleet', ['Multi-vehicle & driver management', 'Consolidated billing (GST invoices)', 'Fleet dashboards & APIs', 'Dedicated account manager'], 'Contact Sales', false],
        ].map(([name, price, per, feats, cta, hot]) => (
          <div key={name} className={`card p-7 flex flex-col ${hot ? 'border-primary/40 shadow-glow relative' : ''}`}>
            {hot && <span className="absolute -top-3 left-1/2 -translate-x-1/2 chip text-bg bg-primary border-primary font-bold">MOST POPULAR</span>}
            <div className="font-bold">{name}</div>
            <div className="mt-3"><span className="text-4xl font-black">{price}</span> <span className="text-sub text-sm">{per}</span></div>
            <div className="mt-5 space-y-2.5 flex-1">
              {feats.map(f => <div key={f} className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{f}</div>)}
            </div>
            <Link to="/register" className={`${hot ? 'btn-primary' : 'btn-ghost'} w-full mt-6`}>{cta}</Link>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 text-center mt-6">Charging tariffs (₹/kWh) are set by operators and shown before every session. Demo pricing for competition prototype.</p>
    </Page>
  );
}

export function Business() {
  return (
    <Page kicker="For Business" title="Turn your chargers into a trusted destination." sub="ChargeOne gives charge point operators live fleet health, verified-status marketing, fault triage and payment dispute tooling — while bringing new drivers to your plugs.">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[[BarChart3, 'Utilization & revenue analytics', 'Sessions, energy, revenue and utilization per charger, station and city.'],
          [Bell, 'Instant fault alerts', 'User reports and telemetry anomalies reach your team in seconds, not support tickets.'],
          [ShieldCheck, 'Reliability that sells', 'High health scores are shown to every nearby driver — reliability becomes a growth channel.'],
          [Zap, 'OCPI/OCPP-ready', 'Integrate with standards-compatible APIs. ESP32/IoT-based retrofits supported for legacy hardware.'],
        ].map(([I, t, b]) => (
          <div key={t} className="card card-hover p-6"><I className="w-6 h-6 text-primary mb-4" /><div className="font-bold text-sm">{t}</div><p className="text-sm text-sub mt-2">{b}</p></div>
        ))}
      </div>
      <div className="card p-8 mt-10 text-center border-primary/25">
        <h3 className="text-2xl font-extrabold">Onboard your network</h3>
        <p className="text-sub mt-2 max-w-lg mx-auto text-sm">Operator onboarding takes days, not months. Try the operator console with the demo login.</p>
        <div className="flex justify-center gap-3 mt-5">
          <Link to="/login" className="btn-primary">Try Operator Demo</Link>
          <a href="mailto:partners@chargeone.demo" className="btn-ghost">partners@chargeone.demo</a>
        </div>
      </div>
    </Page>
  );
}

export function About() {
  return (
    <Page kicker="About" title="An independent platform for a fragmented charging landscape." sub="ChargeOne is an independent charging aggregation and software platform connecting EV users with participating charging networks. We don't own chargers — we make every supported charger discoverable, verifiable and accountable.">
      <div className="grid md:grid-cols-3 gap-4">
        {[['Mission', 'Make public EV charging as dependable as filling petrol — verified before you drive, transparent after you pay.'],
          ['What we are', 'A discovery, verification, payment-visibility and support layer that sits on top of participating charging networks.'],
          ['What we are not', 'We are not a charging network, we do not own stations, and we never claim every Indian charger is integrated.'],
        ].map(([t, b]) => (
          <div key={t} className="card p-6"><div className="font-bold text-primary text-sm uppercase tracking-wider">{t}</div><p className="text-sm text-sub mt-3 leading-relaxed">{b}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 text-center">
        {[['2025', 'Founded (demo)'], ['27', 'Participating networks'], ['7', 'Cities in prototype'], ['3', 'Roles: user · operator · admin']].map(([n, l]) => (
          <div key={l} className="card p-6"><div className="text-3xl font-black text-primary">{n}</div><div className="text-xs text-sub mt-1">{l}</div></div>
        ))}
      </div>
    </Page>
  );
}

export function SupportPublic() {
  return (
    <Page kicker="Support" title="One support surface for every charge." sub="Whether the charger belongs to Tata Power, Statiq or ChargeZone — if you charged through ChargeOne, we track the issue with the right operator for you.">
      <div className="grid md:grid-cols-3 gap-4">
        {[[MessageSquare, 'In-app fault reporting', 'Report a dead charger in 20 seconds. It is flagged “under verification” for other drivers immediately.'],
          [Mail, 'support@chargeone.demo', 'Median first response under 15 minutes for active-session issues (demo target).'],
          [Phone, '1800-CHARGE-1', '24×7 helpline for stranded-charging situations.'],
        ].map(([I, t, b]) => (
          <div key={t} className="card p-6"><I className="w-6 h-6 text-primary mb-4" /><div className="font-bold text-sm">{t}</div><p className="text-sm text-sub mt-2">{b}</p></div>
        ))}
      </div>
      <div className="card p-6 mt-8">
        <div className="font-bold mb-4">Common questions</div>
        {[['I paid but charging never started', 'The transaction automatically enters a protected state and a reversal workflow begins. Track it live in Refund Center after logging in.'],
          ['The charger looks different from the app', 'Report it via Report a Fault — photos help operators fix listings fast.'],
          ['My refund is taking long', 'Reversal timelines depend on the payment provider and bank. The Refund Center shows exactly which step is pending.'],
        ].map(([q, a]) => (
          <div key={q} className="py-3 border-b border-line last:border-0">
            <div className="font-semibold text-sm">{q}</div>
            <div className="text-sm text-sub mt-1">{a}</div>
          </div>
        ))}
        <Link to="/login" className="btn-primary mt-5">Log in to raise an issue</Link>
      </div>
    </Page>
  );
}
