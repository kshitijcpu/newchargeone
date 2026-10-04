const TOKEN_KEY = 'co_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') {
      setToken(null);
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const fmtINR = (n, dec = 2) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: dec === 0 ? 0 : 2, maximumFractionDigits: 2 });
export const timeAgo = (iso) => {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
};
export const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtDur = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export const STATUS_META = {
  AVAILABLE: { label: 'Available', color: '#A3E635', cls: 'text-primary bg-primary/10 border-primary/30' },
  OCCUPIED: { label: 'Busy', color: '#F59E0B', cls: 'text-warn bg-warn/10 border-warn/30' },
  BUSY: { label: 'Busy', color: '#F59E0B', cls: 'text-warn bg-warn/10 border-warn/30' },
  CHARGING: { label: 'Charging', color: '#22D3EE', cls: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/30' },
  FAULT: { label: 'Fault', color: '#EF4444', cls: 'text-danger bg-danger/10 border-danger/30' },
  OFFLINE: { label: 'Offline', color: '#64748B', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
  MAINTENANCE: { label: 'Maintenance', color: '#F59E0B', cls: 'text-warn bg-warn/10 border-warn/30' },
  COMPLETED: { label: 'Completed', color: '#A3E635', cls: 'text-primary bg-primary/10 border-primary/30' },
  INTERRUPTED: { label: 'Interrupted', color: '#EF4444', cls: 'text-danger bg-danger/10 border-danger/30' },
  FAILED: { label: 'Failed — Protected', color: '#EF4444', cls: 'text-danger bg-danger/10 border-danger/30' },
  SETTLED: { label: 'Settled', color: '#A3E635', cls: 'text-primary bg-primary/10 border-primary/30' },
  AUTHORIZED: { label: 'Authorized', color: '#22D3EE', cls: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/30' },
  REFUNDED: { label: 'Refunded', color: '#A3E635', cls: 'text-primary bg-primary/10 border-primary/30' },
  REFUND_PENDING: { label: 'Refund Pending', color: '#F59E0B', cls: 'text-warn bg-warn/10 border-warn/30' },
  REFUND_PROCESSING: { label: 'Refund Processing', color: '#F59E0B', cls: 'text-warn bg-warn/10 border-warn/30' },
  PROCESSING: { label: 'Processing', color: '#F59E0B', cls: 'text-warn bg-warn/10 border-warn/30' },
  CONFIRMED: { label: 'Confirmed', color: '#A3E635', cls: 'text-primary bg-primary/10 border-primary/30' },
  CANCELLED: { label: 'Cancelled', color: '#64748B', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
  ACTIVE: { label: 'Active', color: '#A3E635', cls: 'text-primary bg-primary/10 border-primary/30' },
  SUSPENDED: { label: 'Suspended', color: '#EF4444', cls: 'text-danger bg-danger/10 border-danger/30' },
  PENDING: { label: 'Pending', color: '#F59E0B', cls: 'text-warn bg-warn/10 border-warn/30' },
  UNDER_VERIFICATION: { label: 'Under Verification', color: '#F59E0B', cls: 'text-warn bg-warn/10 border-warn/30' },
  ASSIGNED_TO_OPERATOR: { label: 'With Operator', color: '#22D3EE', cls: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/30' },
  RESOLVED: { label: 'Resolved', color: '#A3E635', cls: 'text-primary bg-primary/10 border-primary/30' },
  AWAITING_OPERATOR: { label: 'Awaiting Operator', color: '#F59E0B', cls: 'text-warn bg-warn/10 border-warn/30' },
};
export const meta = (s) => STATUS_META[s] || { label: s || '—', color: '#94A3B8', cls: 'text-sub bg-slate-500/10 border-slate-500/30' };
