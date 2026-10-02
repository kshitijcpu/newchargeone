import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Map, Zap, History, User, LayoutDashboard, MapPin, Car, Wallet, ReceiptText, RotateCcw, Heart, Bell, LifeBuoy, Route, LogOut, Menu, X, Building2, PlugZap, Activity, IndianRupee, AlertTriangle, Tags, Settings, Users, Landmark, Scale, BarChart3, ChevronRight, CalendarClock, Siren, Cable, FileClock } from 'lucide-react';
import { Logo, Toasts, StatusBadge } from './ui';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';

/* ---------------- PUBLIC ---------------- */
const publicLinks = [
  ['/stations', 'Find Chargers'], ['/how-it-works', 'How It Works'], ['/networks', 'Networks'],
  ['/pricing', 'Pricing'], ['/business', 'For Business'], ['/about', 'About'], ['/support', 'Support'],
];

export function PublicLayout() {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  const dash = user?.role === 'ADMIN' ? '/admin' : user?.role === 'OPERATOR' ? '/operator/dashboard' : '/dashboard';
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-bg/80 border-b border-line">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/"><Logo /></Link>
          <nav className="hidden lg:flex items-center gap-1">
            {publicLinks.map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'text-primary bg-primary/10' : 'text-sub hover:text-ink'}`}>{label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to={dash} className="btn-primary">Open App <ChevronRight className="w-4 h-4" /></Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost hidden sm:inline-flex">Log in</Link>
                <Link to="/register" className="btn-primary">Get Started</Link>
              </>
            )}
            <button className="lg:hidden btn-ghost !px-2.5" onClick={() => setOpen(!open)}>{open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
          </div>
        </div>
        {open && (
          <div className="lg:hidden border-t border-line bg-card px-4 py-3 space-y-1 animate-fadeUp">
            {publicLinks.map(([to, label]) => (
              <NavLink key={to} to={to} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-sub hover:text-ink hover:bg-card2">{label}</NavLink>
            ))}
            {!user && <NavLink to="/login" className="block px-3 py-2.5 rounded-lg text-sm font-medium text-primary">Log in</NavLink>}
          </div>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-line mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="text-sm text-sub mt-3 leading-relaxed">An independent charging aggregation and software platform connecting EV users with participating charging networks across India.</p>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-sub mb-3">Platform</div>
            {[['Find Chargers', '/stations'], ['How It Works', '/how-it-works'], ['Route Planner', '/how-it-works'], ['Pricing', '/pricing']].map(([l, t]) => <Link key={l} to={t} className="block text-sm text-sub hover:text-primary py-1">{l}</Link>)}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-sub mb-3">Company</div>
            {[['About', '/about'], ['For Business', '/business'], ['Networks', '/networks'], ['Support', '/support']].map(([l, t]) => <Link key={l} to={t} className="block text-sm text-sub hover:text-primary py-1">{l}</Link>)}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-sub mb-3">Legal</div>
            {['Terms', 'Privacy', 'Refund Policy'].map(l => <span key={l} className="block text-sm text-sub py-1">{l}</span>)}
            <p className="text-[11px] text-slate-600 mt-3">Reliability scores are informational indicators, not industry certifications. Refund timelines depend on the payment provider and bank.</p>
          </div>
        </div>
        <div className="border-t border-line py-4 text-center text-xs text-slate-600">© 2026 ChargeOne Technologies Pvt. Ltd. — One platform. Every charge.</div>
      </footer>
      <Toasts />
    </div>
  );
}

/* ---------------- SHELL (shared app chrome) ---------------- */
function Shell({ links, accent, roleLabel, bottomNav, fab }) {
  const { user, logout, unread, setUnread, netStats } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 z-50 h-screen w-72 md:w-64 shrink-0 bg-card border-r border-line flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-line flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <button className="md:hidden btn-ghost !p-2" onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 border-b border-line">
          <div className="text-sm font-bold truncate">{user?.name}</div>
          <div className={`text-[11px] font-semibold uppercase tracking-wider ${accent}`}>{roleLabel}</div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {links.map(([to, label, Icon, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${isActive ? 'bg-primary/10 text-primary border border-primary/20' : 'text-sub hover:text-ink hover:bg-card2 border border-transparent'}`}>
              <Icon className="w-4 h-4 shrink-0" /> {label}
              {label === 'Notifications' && unread > 0 && <span className="ml-auto text-[10px] font-bold bg-danger text-white rounded-full px-1.5 py-0.5">{unread}</span>}
            </NavLink>
          ))}
        </nav>
        {netStats && (
          <div className="px-4 py-3 border-t border-line text-[11px] text-sub flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulseDot" />
            Live network — {netStats.online} chargers online · {netStats.liveSessions} charging now
          </div>
        )}
        <button onClick={() => { logout(); nav('/'); }} className="m-3 btn-ghost justify-start !text-danger"><LogOut className="w-4 h-4" /> Sign out</button>
      </aside>
      {open && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 backdrop-blur-xl bg-bg/85 border-b border-line flex items-center gap-3 px-4">
          <button className="md:hidden btn-ghost !p-2" onClick={() => setOpen(true)}><Menu className="w-4 h-4" /></button>
          <div className="text-sm font-semibold text-sub truncate">{roleLabel} Console</div>
          <div className="ml-auto flex items-center gap-2">
            {netStats && <span className="hidden sm:flex chip text-primary bg-primary/10 border-primary/30"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulseDot" />LIVE</span>}
            <Link to={links.find(l => l[1] === 'Notifications')?.[0] || '/notifications'} onClick={() => setUnread(0)} className="relative btn-ghost !p-2.5">
              <Bell className="w-4 h-4" />
              {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold bg-danger text-white rounded-full flex items-center justify-center">{unread}</span>}
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      {bottomNav && (
        <>
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-line grid grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
            {bottomNav.map(([to, label, Icon]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${isActive ? 'text-primary' : 'text-sub'}`}>
                <Icon className="w-5 h-5" /> {label}
              </NavLink>
            ))}
          </nav>
          {fab && (
            <Link to={fab.to} className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-2xl bg-primary text-bg flex flex-col items-center justify-center shadow-glow font-bold active:scale-95 transition">
              <Zap className="w-6 h-6 fill-bg" /><span className="text-[8px] -mt-0.5">CHARGE</span>
            </Link>
          )}
        </>
      )}
      <Toasts />
    </div>
  );
}

/* ---------------- ROLE LAYOUTS ---------------- */
export function UserLayout() {
  return <Shell roleLabel="EV Driver" accent="text-primary"
    links={[
      ['/dashboard', 'Dashboard', LayoutDashboard],
      ['/app/stations', 'Find Charger', MapPin],
      ['/route-planner', 'Route Planner', Route],
      ['/booking', 'Reservations', CalendarClock],
      ['/history', 'Charging History', History],
      ['/wallet', 'Wallet', Wallet],
      ['/payments', 'Payments', ReceiptText],
      ['/refunds', 'Refund Center', RotateCcw],
      ['/vehicles', 'My Vehicles', Car],
      ['/favorites', 'Favorites', Heart],
      ['/notifications', 'Notifications', Bell],
      ['/support/report', 'Report a Fault', AlertTriangle],
      ['/app/support', 'Support', LifeBuoy],
      ['/profile', 'Profile', User],
    ]}
    bottomNav={[['/app/stations', 'Map', Map], ['/dashboard', 'Charge', Zap], ['/history', 'History', History], ['/profile', 'Profile', User]]}
    fab={{ to: '/app/stations' }}
  />;
}

export function OperatorLayout() {
  return <Shell roleLabel="Operator" accent="text-cyan-300"
    links={[
      ['/operator/dashboard', 'Dashboard', LayoutDashboard],
      ['/operator/stations', 'Stations', Building2],
      ['/operator/chargers', 'Chargers', PlugZap],
      ['/operator/sessions', 'Sessions', Activity],
      ['/operator/revenue', 'Revenue', IndianRupee],
      ['/operator/incidents', 'Incidents', Siren],
      ['/operator/faults', 'Faults', AlertTriangle],
      ['/operator/pricing', 'Pricing', Tags],
      ['/operator/settings', 'Settings', Settings],
    ]}
    bottomNav={[['/operator/dashboard', 'Home', LayoutDashboard], ['/operator/chargers', 'Chargers', PlugZap], ['/operator/sessions', 'Sessions', Activity], ['/operator/revenue', 'Revenue', IndianRupee]]}
  />;
}

export function AdminLayout() {
  return <Shell roleLabel="ChargeOne Admin" accent="text-warn"
    links={[
      ['/admin', 'Control Center', LayoutDashboard, true],
      ['/admin/map', 'Live Map', Map],
      ['/admin/users', 'Users', Users],
      ['/admin/operators', 'Operators', Building2],
      ['/admin/payments', 'Payments', Landmark],
      ['/admin/refunds', 'Refunds', RotateCcw],
      ['/admin/disputes', 'Disputes', Scale],
      ['/admin/analytics', 'Analytics', BarChart3],
      ['/admin/integrations', 'Integrations', Cable],
      ['/admin/audit', 'Audit Ledger', FileClock],
    ]}
    bottomNav={[['/admin', 'Home', LayoutDashboard], ['/admin/map', 'Map', Map], ['/admin/payments', 'Payments', Landmark], ['/admin/audit', 'Audit', FileClock]]}
  />;
}

export function RequireRole({ role, children }) {
  const { user, booting } = useApp();
  const nav = useNavigate();
  useEffect(() => {
    if (!booting && !user) nav('/login');
    else if (!booting && user && role && user.role !== role) nav(user.role === 'ADMIN' ? '/admin' : user.role === 'OPERATOR' ? '/operator/dashboard' : '/dashboard');
  }, [user, booting]);
  if (booting) return <div className="min-h-screen flex items-center justify-center"><div className="skeleton w-40 h-10" /></div>;
  if (!user || (role && user.role !== role)) return null;
  return children;
}
