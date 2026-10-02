import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ShieldCheck, MapPin, RotateCcw, Radio, Route, Layers, Smartphone, AlertTriangle, CreditCard, LifeBuoy, ChevronDown, Star, ArrowRight, Activity, CheckCircle2, Gauge, PlugZap } from 'lucide-react';
import MapView from '../../components/MapView';
import { HealthRing, StatusBadge } from '../../components/ui';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';

function CountUp({ to, suffix = '', dur = 1400 }) {
  const [v, setV] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, dur]);
  return <span ref={ref}>{v.toLocaleString('en-IN')}{suffix}</span>;
}

const Section = ({ children, className = '' }) => <section className={`max-w-7xl mx-auto px-4 py-16 md:py-24 ${className}`}>{children}</section>;
const Kicker = ({ children }) => <div className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">{children}</div>;

export default function Home() {
  const [stations, setStations] = useState([]);
  const [stats, setStats] = useState({ stations: 1248, online: 986, charging: 421, networks: 27 });
  const [faq, setFaq] = useState(0);
  const { netStats } = useApp();

  useEffect(() => {
    api('/stations').then(d => setStations(d.stations)).catch(() => {});
    api('/stats').then(setStats).catch(() => {});
  }, []);

  const problems = [
    { icon: Smartphone, title: 'Multiple Apps', body: 'Different charging networks may require different apps or payment flows.' },
    { icon: AlertTriangle, title: 'Uncertain Availability', body: 'A charger can appear available but fail when the user arrives.' },
    { icon: CreditCard, title: 'Payment Friction', body: 'A failed charging attempt can create confusion around payment status.' },
    { icon: LifeBuoy, title: 'Fragmented Support', body: 'Users may have to determine which operator to contact.' },
  ];

  const uvp = [
    { icon: Layers, t: 'One Platform', b: 'Multiple participating charging networks in a single interface.' },
    { icon: ShieldCheck, t: 'Charger Health', b: 'See operational indicators instead of only availability.' },
    { icon: CreditCard, t: 'Payment Visibility', b: 'Track the entire transaction lifecycle — from authorization to settlement.' },
    { icon: RotateCcw, t: 'Centralized Issue Tracking', b: 'One place for charging-related support and refund status.' },
    { icon: Radio, t: 'Live Network', b: 'Real-time charger status streamed straight from station telemetry.' },
    { icon: Route, t: 'Smart Routing', b: 'Plan charging stops based on vehicle and charger conditions.' },
  ];

  const faqs = [
    ['Does ChargeOne own the charging stations?', 'No. ChargeOne is an independent charging aggregation and software platform connecting EV users with participating charging networks. Stations remain owned and operated by their respective operators.'],
    ['What is the Charger Health score?', 'A transparent, informational reliability indicator that ChargeOne computes from operational telemetry: successful sessions (40%), recent availability (20%), communication uptime (15%), fault frequency (15%) and user reports (10%). It is not an industry certification.'],
    ['What happens if I pay but the charger fails to start?', 'ChargeOne uses authorization-first payment flows where the provider supports them. If the charger handshake fails before energy delivery, the transaction moves to a protected state and a reversal/adjustment is initiated automatically — and you can track every step in the Refund Center.'],
    ['Are all Indian charging stations on ChargeOne?', 'No — ChargeOne shows participating networks and supported stations. Coverage grows as more operators integrate via OCPI/OCPP-compatible interfaces.'],
    ['How fast are refunds?', 'Reversal timelines depend on the payment provider and your bank. ChargeOne initiates the workflow immediately and shows a live status timeline instead of leaving you guessing.'],
  ];

  const testimonials = [
    ['Kshitij S.', 'Mumbai · Nexon EV', 'Drove to a "working" charger three times last month on other apps. The health score here has been right every single time.'],
    ['Ananya I.', 'Pune · Atto 3', 'A session failed at the expressway plaza — the app already had the reversal running before I even opened support. That was the moment I switched.'],
    ['Rohan M.', 'Delhi · ZS EV', 'One history for every network I use. Payments, refunds, faults — nothing disappears into a black hole anymore.'],
  ];

  return (
    <div className="overflow-x-hidden">
      {/* HERO */}
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(700px 380px at 20% 0%, rgba(163,230,53,0.10), transparent), radial-gradient(600px 300px at 85% 20%, rgba(34,211,238,0.06), transparent)' }} />
        <Section className="!py-12 md:!py-20 grid lg:grid-cols-2 gap-10 items-center relative">
          <div className="animate-fadeUp">
            <div className="chip text-primary bg-primary/10 border-primary/30 mb-5"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulseDot" /> LIVE — {netStats ? `${netStats.online} chargers online` : 'network telemetry streaming'}</div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
              One platform.<br /><span className="text-primary">Every charge.</span>
            </h1>
            <p className="text-sub text-base md:text-lg mt-5 max-w-lg leading-relaxed">
              Find, verify and pay for EV charging stations across participating networks — with transparent charging sessions and centralized payment support.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link to="/stations" className="btn-primary !px-6 !py-3.5 !text-base">Find a Charger <ArrowRight className="w-4 h-4" /></Link>
              <Link to="/how-it-works" className="btn-ghost !px-6 !py-3.5 !text-base">How It Works</Link>
            </div>
            <div className="flex items-center gap-5 mt-8 text-xs text-sub">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />Available</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warn" />Busy</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" />Fault</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" />Offline</span>
            </div>
          </div>
          <div className="relative animate-fadeUp" style={{ animationDelay: '.15s' }}>
            <MapView stations={stations} height="440px" center={[19.076, 72.9]} zoom={10} className="shadow-card" showLocateBtn pulse />
            <div className="absolute -bottom-4 left-4 right-4 md:left-8 md:right-auto card px-4 py-3 flex items-center gap-3 backdrop-blur border-primary/25">
              <HealthRing score={94} size={44} stroke={5} />
              <div>
                <div className="text-xs font-bold">Andheri East Hub · CCS2 60 kW</div>
                <div className="text-[11px] text-sub">Verified 3 min ago · handshake ready</div>
              </div>
              <StatusBadge status="AVAILABLE" />
            </div>
          </div>
        </Section>
      </div>

      {/* STATS */}
      <div className="border-y border-line bg-card/40">
        <Section className="!py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[[1248, '+', 'Charging Stations'], [986, '', 'Currently Online'], [421, '', 'Currently Charging'], [27, '', 'Participating Networks']].map(([n, s, l]) => (
            <div key={l}>
              <div className="text-3xl md:text-4xl font-black text-primary"><CountUp to={n} suffix={s} /></div>
              <div className="text-xs md:text-sm text-sub font-medium mt-1">{l}</div>
            </div>
          ))}
        </Section>
      </div>

      {/* PROBLEM */}
      <Section>
        <Kicker>The EV Charging Problem</Kicker>
        <h2 className="section-title max-w-2xl">"Finding a charger is only part of the problem."</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {problems.map((p, i) => (
            <div key={p.title} className="card card-hover p-6 animate-fadeUp" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="w-11 h-11 rounded-xl bg-danger/10 border border-danger/25 flex items-center justify-center mb-4"><p.icon className="w-5 h-5 text-danger" /></div>
              <div className="font-bold">{p.title}</div>
              <p className="text-sm text-sub mt-2 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-lg font-semibold text-center max-w-2xl mx-auto">ChargeOne brings <span className="text-primary">discovery, verification, charging sessions and payment support</span> into one interface.</p>
      </Section>

      {/* HOW IT WORKS */}
      <div className="bg-card/40 border-y border-line">
        <Section>
          <Kicker>How ChargeOne Works</Kicker>
          <h2 className="section-title">From "is it working?" to "fully charged."</h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 mt-10">
            {[[MapPin, 'Discover', 'Find supported chargers across networks'], [Gauge, 'Verify', 'Check live charger health before you drive'], [CreditCard, 'Authorize', 'Payment held — captured only after delivery'], [PlugZap, 'Handshake', 'Charger verified again before energy flows'], [Activity, 'Charge', 'Monitor power, energy and cost live'], [RotateCcw, 'Settle', 'Final amount captured, unused amount released']].map(([I, t, b], i) => (
              <div key={t} className="card p-5 relative animate-fadeUp" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="text-[10px] font-black text-primary/60 absolute top-3 right-4">0{i + 1}</div>
                <I className="w-5 h-5 text-primary mb-3" />
                <div className="font-bold text-sm">{t}</div>
                <p className="text-xs text-sub mt-1.5 leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* CHARGER HEALTH */}
      <Section className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <Kicker>Charger Reliability</Kicker>
          <h2 className="section-title">Not just "Available".<br />Actually <span className="text-primary">verified</span>.</h2>
          <p className="text-sub mt-4 leading-relaxed max-w-md">Every supported charger carries a transparent health score built from real operational signals — so you know a charger works before you drive to it.</p>
          <div className="mt-6 space-y-2.5">
            {[['Successful sessions', '40%'], ['Recent availability', '20%'], ['Communication uptime', '15%'], ['Fault frequency', '15%'], ['User reports', '10%']].map(([l, w]) => (
              <div key={l} className="flex items-center gap-3 text-sm">
                <span className="w-14 text-right font-bold text-primary text-xs">{w}</span>
                <div className="flex-1 h-2 rounded-full bg-card2 overflow-hidden"><div className="h-full bg-primary/70 rounded-full" style={{ width: w.replace('%', '') * 2.2 + '%' }} /></div>
                <span className="text-sub text-xs w-44">{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-8 border-primary/20 shadow-glow max-w-md mx-auto w-full">
          <div className="text-xs font-bold uppercase tracking-widest text-sub mb-4">Charger Health</div>
          <div className="flex items-center gap-6">
            <HealthRing score={94} size={110} stroke={10} />
            <div className="space-y-2 text-sm">
              {['Online', 'Connector detected', 'Recent successful session', 'Network connection healthy', 'Payment handshake ready'].map(c => (
                <div key={c} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /><span>{c}</span></div>
              ))}
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-line text-xs text-sub">Last successful charging session: <span className="text-ink font-semibold">7 minutes ago</span></div>
        </div>
      </Section>

      {/* PROTECTED PAYMENT */}
      <div className="bg-card/40 border-y border-line">
        <Section className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="card p-6 max-w-md mx-auto w-full order-2 lg:order-1">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold uppercase tracking-widest text-sub">Transaction CO-2026-000482</div>
              <span className="chip text-danger bg-danger/10 border-danger/30">Protected</span>
            </div>
            {[['Payment initiated', true], ['₹500 authorized (not captured)', true], ['Charger handshake', false, true], ['Reversal initiated automatically', true], ['Provider processing', true], ['Bank settlement', null]].map(([t, done, failed], i) => (
              <div key={i} className="flex items-center gap-3 py-2 text-sm">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${failed ? 'bg-danger/15 border-danger/50' : done ? 'bg-primary/15 border-primary/50' : 'bg-card2 border-line'}`}>
                  {failed ? <span className="text-danger text-[10px] font-black">✕</span> : done ? <span className="text-primary text-[10px] font-black">✓</span> : <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                </div>
                <span className={failed ? 'text-danger font-semibold' : done ? '' : 'text-sub'}>{t}</span>
              </div>
            ))}
            <div className="mt-3 rounded-xl bg-bg border border-line p-3 text-xs text-sub">Charging never started — the authorization is being released. Nothing to chase, nothing hidden.</div>
          </div>
          <div className="order-1 lg:order-2">
            <Kicker>Protected Payment Concept</Kicker>
            <h2 className="section-title">Paid, but the charger failed?<br /><span className="text-primary">You're covered.</span></h2>
            <p className="text-sub mt-4 leading-relaxed max-w-md">ChargeOne authorizes first and captures only after energy is delivered — wherever the payment provider supports it. If a charger handshake fails, the transaction enters a protected state and a reversal workflow starts automatically, with a live timeline you can track.</p>
            <Link to="/how-it-works" className="btn-ghost mt-6">See the full payment lifecycle <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </Section>
      </div>

      {/* UVP GRID */}
      <Section>
        <Kicker>Why ChargeOne</Kicker>
        <h2 className="section-title">Built for the multi-network reality of Indian EV charging.</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {uvp.map((u, i) => (
            <div key={u.t} className="card card-hover p-6 animate-fadeUp" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-4"><u.icon className="w-5 h-5 text-primary" /></div>
              <div className="font-bold uppercase text-sm tracking-wide">{u.t}</div>
              <p className="text-sm text-sub mt-2 leading-relaxed">{u.b}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* LIVE DASH + ROUTE + OPERATOR */}
      <div className="bg-card/40 border-y border-line">
        <Section className="grid md:grid-cols-3 gap-4">
          {[
            [Activity, 'Live charging dashboard', 'Watch power, energy, percentage and cost update in real time while your car charges — from your phone, anywhere.'],
            [Route, 'Route planner', 'Mumbai to Pune? ChargeOne plans your stops using range, charger compatibility, live availability and reliability.'],
            [Zap, 'Operator benefits', 'Operators get live fleet health, fault alerts, utilization and revenue analytics — and fewer support calls.'],
          ].map(([I, t, b]) => (
            <div key={t} className="card card-hover p-6">
              <I className="w-6 h-6 text-primary mb-4" />
              <div className="font-bold">{t}</div>
              <p className="text-sm text-sub mt-2 leading-relaxed">{b}</p>
            </div>
          ))}
        </Section>
      </div>

      {/* TESTIMONIALS */}
      <Section>
        <Kicker>What drivers say</Kicker>
        <h2 className="section-title">Trusted at the plug.</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-10">
          {testimonials.map(([name, meta, quote], i) => (
            <div key={name} className="card p-6 animate-fadeUp" style={{ animationDelay: `${i * 90}ms` }}>
              <div className="flex gap-0.5 mb-4">{[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-warn fill-warn" />)}</div>
              <p className="text-sm leading-relaxed">"{quote}"</p>
              <div className="mt-4 pt-4 border-t border-line">
                <div className="font-bold text-sm">{name}</div>
                <div className="text-xs text-sub">{meta}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section className="max-w-3xl">
        <Kicker>FAQ</Kicker>
        <h2 className="section-title mb-8">Straight answers.</h2>
        <div className="space-y-3">
          {faqs.map(([q, a], i) => (
            <div key={i} className="card overflow-hidden">
              <button className="w-full flex items-center justify-between gap-4 p-5 text-left font-semibold text-sm" onClick={() => setFaq(faq === i ? -1 : i)}>
                {q} <ChevronDown className={`w-4 h-4 shrink-0 text-sub transition-transform ${faq === i ? 'rotate-180 text-primary' : ''}`} />
              </button>
              {faq === i && <div className="px-5 pb-5 text-sm text-sub leading-relaxed animate-fadeUp">{a}</div>}
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section className="!py-20">
        <div className="card p-10 md:p-16 text-center relative overflow-hidden border-primary/25">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(500px 250px at 50% 0%, rgba(163,230,53,0.12), transparent)' }} />
          <Zap className="w-10 h-10 text-primary fill-primary mx-auto mb-5 bolt-anim" />
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">Stop gambling on chargers.</h2>
          <p className="text-sub mt-4 max-w-xl mx-auto">Join thousands of EV drivers who verify before they drive, and never lose track of a payment again.</p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link to="/register" className="btn-primary !px-8 !py-3.5 !text-base">Create Free Account</Link>
            <Link to="/stations" className="btn-ghost !px-8 !py-3.5 !text-base">Explore the Map</Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
