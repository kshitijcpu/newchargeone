import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Loader2 } from 'lucide-react';
import { Logo } from '../../components/ui';
import { useApp } from '../../context/AppContext';

const roleHome = (u) => u.role === 'ADMIN' ? '/admin' : u.role === 'OPERATOR' ? '/operator/dashboard' : '/dashboard';

function AuthShell({ title, sub, children }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-14 relative">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(600px 300px at 50% 0%, rgba(163,230,53,0.08), transparent)' }} />
      <div className="card w-full max-w-md p-7 md:p-8 relative animate-fadeUp">
        <div className="flex justify-center mb-5"><Logo size="lg" /></div>
        <h1 className="text-xl font-extrabold text-center">{title}</h1>
        <p className="text-sm text-sub text-center mt-1 mb-6">{sub}</p>
        {children}
      </div>
    </div>
  );
}

export function Login() {
  const { login, toast } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const go = async (e, em, p) => {
    e?.preventDefault();
    setErr(''); setBusy(true);
    try {
      const u = await login(em ?? email, p ?? pw);
      toast(`Welcome back, ${u.name.split(' ')[0]}!`);
      nav(roleHome(u));
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Welcome back" sub="Sign in to your ChargeOne account">
      <form onSubmit={go} className="space-y-4">
        <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
        <div><label className="label">Password</label><input className="input" type="password" required value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" /></div>
        {err && <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-xl px-3 py-2.5">{err}</div>}
        <button className="btn-primary w-full !py-3" disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Sign in</button>
      </form>

      <p className="text-sm text-sub text-center mt-6">New to ChargeOne? <Link to="/register" className="text-primary font-semibold">Create an account</Link></p>
    </AuthShell>
  );
}

export function Register() {
  const { register, toast } = useApp();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const go = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const u = await register(form);
      toast('Account created — welcome to ChargeOne!');
      nav(roleHome(u));
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <AuthShell title="Create your account" sub="Charge across every participating network with one login">
      <form onSubmit={go} className="space-y-4">
        <div><label className="label">Full name</label><input className="input" required value={form.name} onChange={set('name')} placeholder="Kshitij Sharma" /></div>
        <div><label className="label">Email</label><input className="input" type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" /></div>
        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set('phone')} placeholder="+91 98XXXXXXXX" /></div>
        <div><label className="label">Password</label><input className="input" type="password" required minLength={6} value={form.password} onChange={set('password')} placeholder="6+ characters" /></div>
        {err && <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-xl px-3 py-2.5">{err}</div>}
        <button className="btn-primary w-full !py-3" disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Create account</button>
      </form>
      <p className="text-sm text-sub text-center mt-6">Already have an account? <Link to="/login" className="text-primary font-semibold">Sign in</Link></p>
    </AuthShell>
  );
}
