import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db, nextId, audit, notify, publicStation } from './data/store.js';
import * as engine from './services/engine.js';
import { initPersistence, idempotency, ledgerStats, ledgerTail, save, commit } from './services/persistence.js';
import { attachOcpp, connections as ocppConnections } from './services/ocpp.js';
import { ocpiRouter, peers as ocpiPeers, startOcpiSyncLoop } from './services/ocpi.js';
import { providerInfo, createOrder, verifyWebhookSignature, verifyPaymentSignature } from './services/provider.js';
import { stationForecast, forecastAtEta, networkForecast } from './services/forecast.js';

const JWT_SECRET = process.env.JWT_SECRET || 'chargeone-demo-secret-do-not-use-in-prod';
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));

// --- naive rate limiter (per-IP, 240 req/min) ---
const hits = new Map();
app.use((req, res, next) => {
  const k = req.ip + '|' + Math.floor(Date.now() / 60000);
  hits.set(k, (hits.get(k) || 0) + 1);
  if (hits.size > 5000) hits.clear();
  if (hits.get(k) > 240) return res.status(429).json({ error: 'Rate limit exceeded' });
  next();
});

const hash = (pw) => crypto.createHash('sha256').update('co-salt::' + pw).digest('hex');
db.users.forEach(u => { if (u.password) { u.passwordHash = hash(u.password); delete u.password; } });
await initPersistence(db);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 400 || req.originalUrl.startsWith('/api/auth')) {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

const sign = (u) => jwt.sign({ id: u.id, role: u.role, operatorId: u.operatorId || null }, JWT_SECRET, { expiresIn: '12h' });
const authRequired = (roles) => (req, res, next) => {
  try {
    const rawTok = req.headers.authorization || '';
    if (!rawTok) {
      console.warn(`⚠️ [Auth 401] Missing Authorization header: ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ error: 'Authentication required' });
    }
    const tok = rawTok.replace(/^Bearer\s+/i, '').trim();
    const p = jwt.verify(tok, JWT_SECRET);
    req.user = db.users.find(u => u.id === p.id);
    if (!req.user) {
      console.warn(`⚠️ [Auth 401] User ID "${p.id}" from token not found in user store: ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    if (roles && !roles.includes(req.user.role)) {
      console.warn(`⚠️ [Auth 403] Role "${req.user.role}" forbidden for ${req.method} ${req.originalUrl}`);
      return res.status(403).json({ error: 'Forbidden for role ' + req.user.role });
    }
    next();
  } catch (err) {
    console.warn(`⚠️ [Auth 401] JWT verification failed on ${req.method} ${req.originalUrl}:`, err.message);
    res.status(401).json({ error: 'Authentication required' });
  }
};
const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, city: u.city, joined: u.joined, status: u.status, walletBalance: u.walletBalance, operatorId: u.operatorId || null });

// ================= AUTH =================
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone } = req.body || {};
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: 'Name, email and password (6+ chars) are required' });
  const cleanEmail = String(email).trim().toLowerCase();
  if (db.users.some(u => u.email.toLowerCase().trim() === cleanEmail)) return res.status(409).json({ error: 'An account with this email already exists' });
  const u = { id: 'USR_' + Math.floor(2000 + Math.random() * 8000), name: String(name).trim(), email: cleanEmail, passwordHash: hash(String(password).trim()), role: 'USER', phone: phone || '', city: 'Mumbai', joined: new Date().toISOString().slice(0, 10), status: 'ACTIVE', walletBalance: 0 };
  db.users.push(u);
  save('users', u);
  audit('USER', u.id, null, 'ACTIVE', 'User registered');
  res.json({ token: sign(u), user: safeUser(u) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const rawPw = String(password || '');
  const trimmedPw = rawPw.trim();

  const u = db.users.find(x => x.email.toLowerCase().trim() === cleanEmail);
  if (!u) {
    console.warn(`⚠️ [Login 401] User not found for email: "${cleanEmail}"`);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Ensure user has a valid passwordHash
  if (!u.passwordHash && u.password) {
    u.passwordHash = hash(u.password);
    delete u.password;
  }

  const matches = (u.passwordHash === hash(rawPw)) ||
                  (trimmedPw && u.passwordHash === hash(trimmedPw)) ||
                  (u.password && (u.password === rawPw || u.password === trimmedPw));

  if (!matches) {
    console.warn(`⚠️ [Login 401] Password mismatch for email: "${cleanEmail}"`);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (u.status === 'SUSPENDED') return res.status(403).json({ error: 'Account suspended. Contact support.' });
  console.log(`✅ [Login] User "${u.email}" (${u.role}) successfully authenticated`);
  res.json({ token: sign(u), user: safeUser(u) });
});
app.post('/api/auth/logout', (_req, res) => res.json({ ok: true }));
app.get('/api/auth/me', authRequired(), (req, res) => res.json({ user: safeUser(req.user) }));

// ================= STATIONS =================
app.get('/api/stations', (req, res) => {
  let list = db.stations.map(publicStation);
  const { q, city, connector, status, minPower, maxPrice, minHealth, facility } = req.query;
  if (q) { const s = String(q).toLowerCase(); list = list.filter(x => (x.name + x.city + x.address + x.operatorName).toLowerCase().includes(s)); }
  if (city) list = list.filter(x => x.city === city);
  if (connector) list = list.filter(x => x.connectors.includes(connector));
  if (status) list = list.filter(x => x.status === status);
  if (minPower) list = list.filter(x => x.maxPower >= +minPower);
  if (maxPrice) list = list.filter(x => x.pricePerKwh <= +maxPrice);
  if (minHealth) list = list.filter(x => x.health >= +minHealth);
  if (facility) list = list.filter(x => x.facilities.includes(facility));
  res.json({ stations: list });
});
app.get('/api/stations/nearby', (req, res) => {
  const { lat = 19.076, lng = 72.8777, limit = 12 } = req.query;
  // Haversine great-circle distance (km) — accurate from any real GPS position
  const dist = (s) => {
    const R = 6371, toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(s.lat - lat), dLng = toRad(s.lng - lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(+lat)) * Math.cos(toRad(s.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };
  const list = db.stations.map(publicStation).map(s => ({ ...s, distanceKm: +dist(s).toFixed(1) })).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, +limit);
  res.json({ stations: list });
});
app.get('/api/stations/:id', (req, res) => {
  const s = db.stations.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Station not found' });
  res.json({ station: publicStation(s), reviews: db.reviews.filter(r => r.stationId === s.id) });
});

// ================= CHARGERS =================
app.get('/api/chargers/:id', (req, res) => {
  const c = db.chargers.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Charger not found' });
  res.json({ charger: c, station: publicStation(db.stations.find(s => s.id === c.stationId)) });
});
app.get('/api/chargers/:id/status', (req, res) => {
  const c = db.chargers.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Charger not found' });
  res.json(engine.chargerPayload(c));
});
app.get('/api/chargers/:id/precheck', (req, res) => {
  const c = db.chargers.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Charger not found' });
  const ok = (v) => ({ pass: v });
  const online = !['OFFLINE', 'MAINTENANCE'].includes(c.status);
  const available = c.status === 'AVAILABLE';
  res.json({
    chargerId: c.id, verifiedMinAgo: c.lastVerifiedMin,
    checks: [
      { label: 'Station online', ...ok(true) },
      { label: 'Charger available', ...ok(available) },
      { label: 'Connector available', ...ok(available && c.status !== 'FAULT') },
      { label: 'Recent successful session', ...ok(c.lastSuccessMin < 90) },
      { label: 'Network connection healthy', ...ok(online && c.health > 50) },
      { label: 'Payment handshake ready', ...ok(online) },
    ],
    health: c.health, healthFactors: c.healthFactors,
  });
});

app.get('/api/stations/:id/forecast', (req, res) => {
  const f = stationForecast(req.params.id, +req.query.hours || 8);
  if (!f) return res.status(404).json({ error: 'Station not found' });
  res.json(f);
});
app.get('/api/forecast/network', (_req, res) => res.json({ points: networkForecast(), model: 'chargeone-demand-v1 (demo)' }));

// ================= VEHICLES =================
app.get('/api/vehicles', authRequired(), (req, res) => res.json({ vehicles: db.vehicles.filter(v => v.userId === req.user.id) }));
app.post('/api/vehicles', authRequired(), (req, res) => {
  const { name, brand, model, batteryKwh, connector, batteryPct, rangeKm } = req.body || {};
  if (!name || !brand || !connector) return res.status(400).json({ error: 'Name, brand and connector are required' });
  const v = { id: 'VH_' + Math.floor(Math.random() * 100000), userId: req.user.id, name, brand, model: model || '', batteryKwh: +batteryKwh || 40, connector, batteryPct: +batteryPct || 60, rangeKm: +rangeKm || 200, fullRangeKm: Math.round((+rangeKm || 200) / ((+batteryPct || 60) / 100)), primary: db.vehicles.filter(x => x.userId === req.user.id).length === 0 };
  db.vehicles.push(v);
  save('vehicles', v);
  res.json({ vehicle: v });
});
app.patch('/api/vehicles/:id', authRequired(), (req, res) => {
  const v = db.vehicles.find(x => x.id === req.params.id && x.userId === req.user.id);
  if (!v) return res.status(404).json({ error: 'Vehicle not found' });
  if (req.body.primary) db.vehicles.filter(x => x.userId === req.user.id).forEach(x => x.primary = false);
  Object.assign(v, req.body);
  res.json({ vehicle: v });
});
app.delete('/api/vehicles/:id', authRequired(), (req, res) => {
  const i = db.vehicles.findIndex(x => x.id === req.params.id && x.userId === req.user.id);
  if (i < 0) return res.status(404).json({ error: 'Vehicle not found' });
  db.vehicles.splice(i, 1);
  res.json({ ok: true });
});

// ================= BOOKINGS =================
app.get('/api/bookings', authRequired(), (req, res) => res.json({ bookings: db.bookings.filter(b => b.userId === req.user.id) }));
app.post('/api/bookings', authRequired(), (req, res) => {
  const { stationId, chargerId, date, startTime, durationMin } = req.body || {};
  const st = db.stations.find(s => s.id === stationId);
  const ch = db.chargers.find(c => c.id === chargerId);
  if (!st || !ch) return res.status(400).json({ error: 'Invalid station or charger' });
  const b = { id: nextId.booking(), userId: req.user.id, stationId, stationName: st.name, chargerId, chargerCode: ch.code, connector: ch.connector, powerKw: ch.powerKw, date, startTime, durationMin: +durationMin || 30, status: 'CONFIRMED', createdAt: new Date().toISOString() };
  db.bookings.unshift(b);
  save('bookings', b);
  audit('BOOKING', b.id, null, 'CONFIRMED', `Reservation for ${st.name} / ${ch.code}`, req.user.id);
  notify(req.user.id, 'Reservation confirmed', `${b.id} — ${st.name}, ${ch.code} on ${date} at ${startTime}.`, 'booking');
  res.json({ booking: b });
});
app.get('/api/bookings/:id', authRequired(), (req, res) => {
  const b = db.bookings.find(x => x.id === req.params.id && x.userId === req.user.id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  res.json({ booking: b });
});
app.delete('/api/bookings/:id', authRequired(), (req, res) => {
  const b = db.bookings.find(x => x.id === req.params.id && x.userId === req.user.id);
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  b.status = 'CANCELLED';
  audit('BOOKING', b.id, 'CONFIRMED', 'CANCELLED', 'Cancelled by user', req.user.id);
  res.json({ booking: b });
});

// ================= PAYMENTS & SESSIONS =================
app.post('/api/payments/create', authRequired(), async (req, res) => {
  const { chargerId, amount, method } = req.body || {};
  const idemKey = req.headers['idempotency-key'];
  if (idemKey) {
    const existingId = idempotency.get(`${req.user.id}:${idemKey}`);
    if (existingId) {
      const existing = db.payments.find(x => x.id === existingId);
      if (existing) return res.json({ payment: existing, idempotent: true });
    }
  }
  const ch = db.chargers.find(c => c.id === chargerId);
  if (!ch) return res.status(400).json({ error: 'Invalid charger' });
  const amt = Math.max(50, Math.min(5000, +amount || 500));
  const st = db.stations.find(s => s.id === ch.stationId);
  const p = engine.createPayment({ user: req.user, station: st, charger: ch, amount: amt, method });
  try {
    const order = await createOrder(amt, p.id);
    p.providerOrderId = order.orderId;
    p.providerMode = order.mode;
    save('payments', p);
    audit('PAYMENT', p.id, 'AUTHORIZED', 'AUTHORIZED', `Provider order ${order.orderId} (${order.mode})`);
  } catch (e) { audit('PAYMENT', p.id, null, p.status, `Provider order failed: ${e.message}`); }
  if (idemKey) idempotency.put(`${req.user.id}:${idemKey}`, p.id);
  res.json({ payment: p });
});

// Payment provider webhook — signature ALWAYS verified (HMAC-SHA256)
app.post('/api/webhooks/razorpay', (req, res) => {
  const sig = req.headers['x-razorpay-signature'];
  if (!verifyWebhookSignature(req.rawBody || Buffer.from(''), sig)) {
    audit('WEBHOOK', 'razorpay', null, 'REJECTED', 'Invalid or missing HMAC signature');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  const evt = req.body || {};
  audit('WEBHOOK', 'razorpay', null, 'ACCEPTED', `Event ${evt.event || 'unknown'} verified & processed`);
  const payId = evt.payload?.payment?.entity?.order_id;
  if (payId) {
    const p = db.payments.find(x => x.providerOrderId === payId);
    if (p) { p.webhookConfirmed = true; save('payments', p); }
  }
  res.json({ ok: true });
});
app.post('/api/sessions/start', authRequired(), (req, res) => {
  const { paymentId, chargerId, vehicleId, forceHandshakeFail } = req.body || {};
  const p = db.payments.find(x => x.id === paymentId && x.userId === req.user.id);
  const ch = db.chargers.find(c => c.id === chargerId);
  if (!p || !ch) return res.status(400).json({ error: 'Invalid payment or charger' });
  if (p.status !== 'AUTHORIZED') return res.status(400).json({ error: `Payment is in ${p.status} state, expected AUTHORIZED` });
  const st = db.stations.find(s => s.id === ch.stationId);
  const v = db.vehicles.find(x => x.id === vehicleId && x.userId === req.user.id) || db.vehicles.find(x => x.userId === req.user.id && x.primary);
  const result = engine.startSession({ user: req.user, station: st, charger: ch, payment: p, vehicle: v, forceHandshakeFail: !!forceHandshakeFail });
  res.json(result);
});
app.get('/api/sessions/active', authRequired(), (req, res) => {
  const s = db.sessions.find(x => x.live && x.userId === req.user.id);
  res.json({ session: s ? engine.sessionPayload(s) : null });
});
app.get('/api/sessions/:id', authRequired(), (req, res) => {
  const s = db.sessions.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  if (req.user.role === 'USER' && s.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  res.json({ session: { ...s, ...engine.sessionPayload(s) }, payment: db.payments.find(p => p.id === s.paymentId) || null });
});
app.post('/api/sessions/:id/stop', authRequired(), (req, res) => {
  const s = db.sessions.find(x => x.id === req.params.id && x.userId === req.user.id);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  engine.stopSession(s, 'USER_STOP');
  res.json({ session: { ...s, ...engine.sessionPayload(s) } });
});
app.get('/api/history', authRequired(), (req, res) => {
  res.json({ sessions: db.sessions.filter(s => s.userId === req.user.id).map(s => ({ ...s, ...engine.sessionPayload(s) })) });
});
app.get('/api/payments', authRequired(), (req, res) => res.json({ payments: db.payments.filter(p => p.userId === req.user.id) }));
app.get('/api/payments/:id', authRequired(), (req, res) => {
  const p = db.payments.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Payment not found' });
  if (req.user.role === 'USER' && p.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  res.json({ payment: p, session: db.sessions.find(s => s.id === p.sessionId) || null, refunds: db.refunds.filter(r => r.paymentId === p.id), audit: db.auditLogs.filter(a => a.entityId === p.id) });
});

// ================= REFUNDS =================
app.get('/api/refunds', authRequired(), (req, res) => res.json({ refunds: db.refunds.filter(r => r.userId === req.user.id) }));
app.get('/api/refunds/:id', authRequired(), (req, res) => {
  const r = db.refunds.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Refund not found' });
  if (req.user.role === 'USER' && r.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  res.json({ refund: r, payment: db.payments.find(p => p.id === r.paymentId) || null });
});
app.post('/api/refunds', authRequired(), (req, res) => {
  const { paymentId, reason } = req.body || {};
  const p = db.payments.find(x => x.id === paymentId && x.userId === req.user.id);
  if (!p) return res.status(400).json({ error: 'Invalid payment' });
  const r = engine.createRefund(p, p.amountAuthorized - p.amountFinal, reason || 'User requested review', 'MANUAL_REVIEW', [
    { step: 'Request received', done: true, at: new Date().toISOString() },
    { step: 'ChargeOne review', done: false, at: null },
    { step: 'Provider processing', done: false, at: null },
    { step: 'Bank settlement pending', done: false, at: null },
  ]);
  res.json({ refund: r });
});

// ================= WALLET / FAVORITES / NOTIFICATIONS =================
app.get('/api/wallet', authRequired(), (req, res) => res.json({ balance: req.user.walletBalance, transactions: db.walletTxns.filter(t => t.userId === req.user.id) }));
// Step 1: Create Razorpay order for wallet recharge
app.post('/api/wallet/recharge/order', authRequired(), async (req, res) => {
  const amt = Math.max(10, Math.min(10000, +req.body.amount || 0));
  try {
    const order = await createOrder(amt, `wallet_${req.user.id}_${Date.now()}`);
    res.json({ orderId: order.orderId, amount: amt, amountPaise: Math.round(amt * 100), mode: order.mode, keyId: process.env.RAZORPAY_KEY_ID || '' });
  } catch (e) {
    res.status(500).json({ error: 'Could not create payment order: ' + e.message });
  }
});

// Step 2: Verify payment & credit wallet
app.post('/api/wallet/recharge/verify', authRequired(), (req, res) => {
  const { orderId, paymentId, signature, amount } = req.body || {};
  const amt = Math.max(10, Math.min(10000, +amount || 0));
  // Verify signature (always true in simulated mode)
  const valid = verifyPaymentSignature(orderId, paymentId, signature);
  if (!valid) return res.status(400).json({ error: 'Invalid payment signature' });
  req.user.walletBalance = +(req.user.walletBalance + amt).toFixed(2);
  const wt = { id: nextId.wallet(), userId: req.user.id, label: `Money added — ${paymentId || 'direct'}`, amount: amt, at: new Date().toISOString() };
  db.walletTxns.unshift(wt);
  commit([['users', req.user], ['walletTxns', wt]]);
  audit('WALLET', req.user.id, null, 'CREDITED', `₹${amt} added via recharge (${paymentId || 'simulated'})`);
  notify(req.user.id, 'Wallet recharged', `₹${amt} has been added to your ChargeOne wallet.`, 'info');
  res.json({ balance: req.user.walletBalance, transaction: wt });
});

// Legacy add (kept for internal use)
app.post('/api/wallet/add', authRequired(), (req, res) => {
  const amt = Math.max(10, Math.min(10000, +req.body.amount || 0));
  req.user.walletBalance = +(req.user.walletBalance + amt).toFixed(2);
  const wt = { id: nextId.wallet(), userId: req.user.id, label: `Money added — ${req.body.method || 'direct'}`, amount: amt, at: new Date().toISOString() };
  db.walletTxns.unshift(wt);
  commit([['users', req.user], ['walletTxns', wt]]);
  res.json({ balance: req.user.walletBalance });
});
app.get('/api/favorites', authRequired(), (req, res) => {
  const ids = db.favorites.filter(f => f.userId === req.user.id).map(f => f.stationId);
  res.json({ stations: db.stations.filter(s => ids.includes(s.id)).map(publicStation) });
});
app.post('/api/favorites/:stationId', authRequired(), (req, res) => {
  const i = db.favorites.findIndex(f => f.userId === req.user.id && f.stationId === req.params.stationId);
  if (i >= 0) db.favorites.splice(i, 1); else db.favorites.push({ userId: req.user.id, stationId: req.params.stationId });
  res.json({ favorited: i < 0 });
});
app.get('/api/notifications', authRequired(), (req, res) => res.json({ notifications: db.notifications.filter(n => n.userId === req.user.id) }));
app.post('/api/notifications/read', authRequired(), (req, res) => {
  db.notifications.filter(n => n.userId === req.user.id).forEach(n => n.read = true);
  res.json({ ok: true });
});

// ================= FAULT REPORTS =================
app.post('/api/reports', authRequired(), (req, res) => {
  const { stationId, chargerId, issue, description, photo } = req.body || {};
  const st = db.stations.find(s => s.id === stationId);
  if (!st || !issue) return res.status(400).json({ error: 'Station and issue type are required' });
  const ch = db.chargers.find(c => c.id === chargerId);
  const r = { id: nextId.report(), userId: req.user.id, userName: req.user.name, stationId, stationName: st.name, chargerId: ch?.id || null, chargerCode: ch?.code || '—', issue, description: description || '', status: 'UNDER_VERIFICATION', photo: !!photo, createdAt: new Date().toISOString() };
  db.faultReports.unshift(r);
  save('faultReports', r);
  if (ch && ch.status === 'AVAILABLE') { ch.status = 'MAINTENANCE'; ch.faultCode = 'UNDER VERIFICATION'; engine.setChargerStatus(ch, 'MAINTENANCE', null, 'user-report'); }
  if (ch) engine.openIncident(ch, 'user-report', issue, r.id, issue === "Charger won't start" ? 'P1' : 'P2');
  audit('FAULT_REPORT', r.id, null, 'UNDER_VERIFICATION', `${issue} at ${st.name}`, req.user.id);
  notify(req.user.id, 'Fault report received', `Issue ${r.id} is under verification. Thank you for keeping the network reliable.`, 'fault');
  const opUser = db.users.find(u => u.role === 'OPERATOR' && u.operatorId === st.operatorId);
  if (opUser) notify(opUser.id, 'New fault report', `${r.id}: ${issue} reported at ${st.name} (${r.chargerCode}).`, 'fault');
  const adm = db.users.find(u => u.role === 'ADMIN');
  if (adm) notify(adm.id, 'New fault report', `${r.id}: ${issue} at ${st.name} — operator notified.`, 'fault');
  res.json({ report: r });
});
app.get('/api/reports', authRequired(), (req, res) => res.json({ reports: db.faultReports.filter(r => req.user.role !== 'USER' || r.userId === req.user.id) }));
app.get('/api/reports/:id', authRequired(), (req, res) => {
  const r = db.faultReports.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Report not found' });
  res.json({ report: r });
});

// ================= ROUTE PLANNER =================
app.post('/api/route-plan', (req, res) => {
  const { from = 'Mumbai', to = 'Pune', batteryPct = 72, connector = 'CCS2', rangeFullKm = 325 } = req.body || {};
  const CITY = { Mumbai: [19.076, 72.8777], Pune: [18.5204, 73.8567], Thane: [19.2183, 72.9781], 'Navi Mumbai': [19.033, 73.0297], Bengaluru: [12.9716, 77.5946], Delhi: [28.6139, 77.209], Hyderabad: [17.385, 78.4867] };
  const A = CITY[from] || CITY.Mumbai, B = CITY[to] || CITY.Pune;
  const distKm = Math.round(Math.sqrt((A[0] - B[0]) ** 2 + (A[1] - B[1]) ** 2) * 111 * 1.25);
  const usable = rangeFullKm * (batteryPct / 100) * 0.85;
  const stops = [];
  let covered = 0, battery = batteryPct;
  const candidates = db.stations.map(publicStation).filter(s => s.connectors.includes(connector) && s.counts.available > 0)
    .map(s => ({ ...s, along: ((s.lat - A[0]) * (B[0] - A[0]) + (s.lng - A[1]) * (B[1] - A[1])) / ((B[0] - A[0]) ** 2 + (B[1] - A[1]) ** 2 || 1) }))
    .filter(s => s.along > 0.05 && s.along < 0.95).sort((a, b) => a.along - b.along);
  let remaining = distKm;
  let legStart = 0;
  if (distKm > usable && candidates.length) {
    let need = distKm, pos = 0;
    for (const c of candidates) {
      const at = Math.round(c.along * distKm);
      if (at - pos > usable * 0.9 || (stops.length === 0 && at >= usable * 0.6)) {
        const chargeMin = Math.round(15 + Math.random() * 15);
        stops.push({ station: c, atKm: at, legKm: at - pos, chargeMin, addPct: 45, estCost: Math.round((c.maxPower >= 50 ? 22 : 11) * c.pricePerKwh), powerKw: c.maxPower });
        pos = at;
        if (distKm - pos < rangeFullKm * 0.6) break;
      }
    }
    if (!stops.length) {
      const mid = candidates[Math.floor(candidates.length / 2)];
      stops.push({ station: mid, atKm: Math.round(mid.along * distKm), legKm: Math.round(mid.along * distKm), chargeMin: 20, addPct: 40, estCost: Math.round(20 * mid.pricePerKwh), powerKw: mid.maxPower });
    }
  }
  stops.forEach(st2 => { st2.forecast = forecastAtEta(st2.station.id, Math.round(st2.atKm / 55 * 60)); });
  const lastLeg = distKm - (stops.length ? stops[stops.length - 1].atKm : 0);
  res.json({
    from, to, distKm, batteryPct, usableRangeKm: Math.round(usable),
    needsCharging: distKm > usable, stops, lastLegKm: lastLeg,
    totalChargeMin: stops.reduce((a, s) => a + s.chargeMin, 0),
    totalEstCost: stops.reduce((a, s) => a + s.estCost, 0),
    driveMin: Math.round(distKm / 55 * 60),
    coords: { from: A, to: B },
  });
});

// ================= OPERATOR =================
const opStations = (req) => db.stations.filter(s => s.operatorId === (req.user.operatorId || 'OP_1'));
app.get('/api/operator/overview', authRequired(['OPERATOR', 'ADMIN']), (req, res) => {
  const sts = opStations(req).map(publicStation);
  const chs = sts.flatMap(s => s.chargers);
  const sess = db.sessions.filter(s => sts.some(x => x.id === s.stationId));
  const today = sess.filter(s => Date.now() - new Date(s.startTime).getTime() < 86400000);
  const revenueToday = today.reduce((a, s) => a + (s.finalAmount || 0), 0) + 42840;
  const days = [...Array(14)].map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000);
    return { day: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), sessions: 60 + Math.round(40 * Math.sin(i / 2) + Math.random() * 25), energy: 380 + Math.round(180 * Math.sin(i / 2.2) + Math.random() * 90), revenue: 9000 + Math.round(4200 * Math.sin(i / 2.1) + Math.random() * 2600), utilization: Math.round(42 + 18 * Math.sin(i / 2.4) + Math.random() * 10), faultRate: +(2 + Math.sin(i) + Math.random() * 1.4).toFixed(1) };
  });
  res.json({
    stations: sts.length || 42, chargers: chs.length || 126,
    online: chs.filter(c => !['OFFLINE', 'MAINTENANCE'].includes(c.status)).length,
    charging: chs.filter(c => c.status === 'CHARGING').length,
    fault: chs.filter(c => c.status === 'FAULT').length,
    sessionsToday: 1284, revenueToday, energyToday: 9428, avgSession: 312,
    weekRevenue: 284200, monthRevenue: 1128420, days,
    liveSessions: db.sessions.filter(s => s.live && sts.some(x => x.id === s.stationId)).map(s => engine.sessionPayload(s)),
  });
});
app.get('/api/operator/stations', authRequired(['OPERATOR', 'ADMIN']), (req, res) => res.json({ stations: opStations(req).map(publicStation) }));
app.get('/api/operator/chargers', authRequired(['OPERATOR', 'ADMIN']), (req, res) => {
  const ids = opStations(req).map(s => s.id);
  res.json({ chargers: db.chargers.filter(c => ids.includes(c.stationId)) });
});
app.post('/api/operator/chargers/:id', authRequired(['OPERATOR', 'ADMIN']), (req, res) => {
  const c = db.chargers.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Charger not found' });
  if (req.body.status) engine.setChargerStatus(c, req.body.status, null, 'operator');
  if (req.body.pricePerKwh) { c.pricePerKwh = +req.body.pricePerKwh; audit('CHARGER', c.id, null, c.status, `Price updated to ₹${c.pricePerKwh}/kWh`, req.user.id); }
  res.json({ charger: c });
});
app.get('/api/operator/sessions', authRequired(['OPERATOR', 'ADMIN']), (req, res) => {
  const ids = opStations(req).map(s => s.id);
  res.json({ sessions: db.sessions.filter(s => ids.includes(s.stationId)).map(s => ({ ...s, ...engine.sessionPayload(s) })) });
});
app.get('/api/operator/faults', authRequired(['OPERATOR', 'ADMIN']), (req, res) => {
  const ids = opStations(req).map(s => s.id);
  res.json({ reports: db.faultReports.filter(r => ids.includes(r.stationId)), chargers: db.chargers.filter(c => ids.includes(c.stationId) && (c.status === 'FAULT' || c.status === 'MAINTENANCE')) });
});

app.get('/api/operator/incidents', authRequired(['OPERATOR', 'ADMIN']), (req, res) => {
  const list = req.user.role === 'ADMIN' ? db.incidents : db.incidents.filter(i => i.operatorId === req.user.operatorId);
  res.json({ incidents: list });
});
app.post('/api/operator/incidents/:id/action', authRequired(['OPERATOR', 'ADMIN']), (req, res) => {
  const inc = db.incidents.find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: 'Incident not found' });
  const { action } = req.body || {};
  if (!['acknowledge', 'investigate', 'resolve', 'maintenance'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
  engine.incidentAction(inc, action, req.user.email);
  res.json({ incident: inc });
});

// ================= ADMIN =================
app.get('/api/admin/overview', authRequired(['ADMIN']), (req, res) => {
  const st = engine.networkStats();
  const days = [...Array(14)].map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000);
    return { day: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), sessions: 3200 + Math.round(700 * Math.sin(i / 2) + Math.random() * 320), energyMwh: +(36 + 8 * Math.sin(i / 2.3) + Math.random() * 4).toFixed(1), revenueL: +(10.4 + 2.4 * Math.sin(i / 2.1) + Math.random() * 1.2).toFixed(1), uptime: +(97 + Math.random() * 2.4).toFixed(1), refundRate: +(1.1 + Math.random() * 0.9).toFixed(2), failureRate: +(2.2 + Math.random() * 1.6).toFixed(2), avgDuration: Math.round(26 + 8 * Math.random()), utilization: Math.round(38 + 16 * Math.sin(i / 2.5) + Math.random() * 8) };
  });
  res.json({
    totalStations: 1248, demoStations: st.stations, online: 986, charging: 421 + st.liveSessions, fault: 27, maintenance: 18,
    users: 24820, operators: 137, sessionsToday: 3842, energyTodayMwh: 42.8, revenueToday: '₹12.4L',
    refundCases: db.refunds.filter(r => r.status === 'PROCESSING').length + 12, openDisputes: db.disputes.filter(d => d.status !== 'RESOLVED').length + 7,
    days, live: st, liveSessions: db.sessions.filter(s => s.live).map(s => engine.sessionPayload(s)),
  });
});
app.get('/api/admin/users', authRequired(['ADMIN']), (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  let list = db.users.map(safeUser);
  if (q) list = list.filter(u => (u.name + u.email + u.id).toLowerCase().includes(q));
  res.json({ users: list });
});
app.get('/api/admin/users/:id', authRequired(['ADMIN']), (req, res) => {
  const u = db.users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json({ user: safeUser(u), sessions: db.sessions.filter(s => s.userId === u.id), payments: db.payments.filter(p => p.userId === u.id), refunds: db.refunds.filter(r => r.userId === u.id), reports: db.faultReports.filter(r => r.userId === u.id) });
});
app.post('/api/admin/users/:id/toggle', authRequired(['ADMIN']), (req, res) => {
  const u = db.users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  u.status = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  audit('USER', u.id, null, u.status, `Status changed by admin`, req.user.id);
  save('users', u);
  res.json({ user: safeUser(u) });
});
app.get('/api/admin/operators', authRequired(['ADMIN']), (req, res) => {
  res.json({ operators: db.operators.map(o => {
    const sts = db.stations.filter(s => s.operatorId === o.id);
    const chs = db.chargers.filter(c => sts.some(s => s.id === c.stationId));
    return { ...o, stationCount: sts.length, chargerCount: chs.length, faultRate: +(chs.filter(c => c.status === 'FAULT').length / (chs.length || 1) * 100).toFixed(1), sessions: 180 + sts.length * 31, revenue: sts.length * 68400 };
  }) });
});
app.post('/api/admin/operators/:id/toggle', authRequired(['ADMIN']), (req, res) => {
  const o = db.operators.find(x => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Operator not found' });
  o.status = o.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  audit('OPERATOR', o.id, null, o.status, 'Status changed by admin', req.user.id);
  save('operators', o);
  res.json({ operator: o });
});
app.get('/api/admin/payments', authRequired(['ADMIN']), (req, res) => {
  let list = db.payments;
  const f = req.query.status;
  if (f === 'Success') list = list.filter(p => ['SETTLED', 'COMPLETED'].includes(p.status));
  else if (f === 'Pending') list = list.filter(p => !['SETTLED', 'REFUNDED', 'FAILED', 'COMPLETED'].includes(p.status));
  else if (f === 'Failed') list = list.filter(p => ['FAILED', 'REFUND_PENDING', 'REFUND_PROCESSING'].includes(p.status));
  else if (f === 'Refunded') list = list.filter(p => p.status === 'REFUNDED');
  res.json({ payments: list });
});
app.get('/api/admin/refunds', authRequired(['ADMIN']), (req, res) => res.json({ refunds: db.refunds }));
app.post('/api/admin/refunds/:id/advance', authRequired(['ADMIN']), (req, res) => {
  const r = db.refunds.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Refund not found' });
  const next = r.timeline.find(t => !t.done);
  if (next) { next.done = true; next.at = new Date().toISOString(); }
  if (!r.timeline.some(t => !t.done)) {
    r.status = 'COMPLETED';
    const p = db.payments.find(x => x.id === r.paymentId);
    if (p && ['REFUND_PENDING', 'REFUND_PROCESSING'].includes(p.status)) {
      if (p.status === 'REFUND_PENDING') engine.transition(p, 'REFUND_PROCESSING', 'Provider processing');
      engine.transition(p, 'REFUNDED', `₹${r.amount} released to source account`);
    }
    notify(r.userId, 'Refund completed', `Refund ${r.id} of ₹${r.amount} settled.`, 'refund');
  }
  r.updatedAt = new Date().toISOString();
  audit('REFUND', r.id, null, r.status, `Admin advanced workflow step`, req.user.id);
  res.json({ refund: r });
});
app.get('/api/admin/disputes', authRequired(['ADMIN']), (req, res) => res.json({ disputes: db.disputes }));
app.get('/api/admin/reports', authRequired(['ADMIN']), (req, res) => res.json({ reports: db.faultReports }));
app.get('/api/admin/audit', authRequired(['ADMIN']), (req, res) => {
  const { entity, q } = req.query;
  let logs = db.auditLogs.slice().reverse();
  if (entity) logs = logs.filter(l => l.entityType === entity);
  if (q) { const t = String(q).toLowerCase(); logs = logs.filter(l => (l.entityId + (l.note || '') + l.entityType).toLowerCase().includes(t)); }
  res.json({ logs: logs.slice(0, 300), total: db.auditLogs.length, ledger: ledgerStats() });
});
app.get('/api/admin/audit/export', authRequired(['ADMIN']), (req, res) => {
  const rows = [['id', 'at', 'entityType', 'entityId', 'from', 'to', 'actor', 'note']];
  db.auditLogs.forEach(l => rows.push([l.id, l.at, l.entityType, l.entityId, l.from || '', l.to, l.actor, (l.note || '').replace(/"/g, "'")]));
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=chargeone-audit-log.csv');
  res.send(csv);
});
app.get('/api/admin/integrations', authRequired(['ADMIN']), (req, res) => {
  res.json({
    ocpp: { endpoint: 'ws://<host>:4000/ocpp/<CHARGER_ID>', protocol: 'ocpp1.6 (JSON)', connections: ocppConnections() },
    ocpi: { endpoint: '/ocpi/2.2', version: '2.2', tokenAuth: 'Authorization: Token <token>', peers: ocpiPeers },
    payments: providerInfo(),
    persistence: ledgerStats(),
    ledgerTail: ledgerTail(25),
  });
});
app.get('/api/admin/incidents', authRequired(['ADMIN']), (req, res) => res.json({ incidents: db.incidents }));
app.post('/api/admin/disputes/:id/action', authRequired(['ADMIN']), (req, res) => {
  const d = db.disputes.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Dispute not found' });
  const { action } = req.body || {};
  const now = new Date().toISOString();
  if (action === 'request-operator') {
    d.status = 'AWAITING_OPERATOR';
    const t = d.timeline.find(x => x.step.toLowerCase().includes('operator'));
    if (t) t.done = false;
    d.evidence.push(`Operator response requested by admin (${now.slice(0, 16)})`);
    audit('DISPUTE', d.id, null, 'AWAITING_OPERATOR', 'Admin requested operator response', req.user.id);
  } else if (action === 'resolve') {
    d.status = 'RESOLVED';
    d.timeline.forEach(t => t.done = true);
    audit('DISPUTE', d.id, null, 'RESOLVED', 'Admin resolved dispute', req.user.id);
    notify(d.userId, 'Dispute resolved', `Dispute ${d.id} (${d.issue}) has been resolved.`, 'refund');
  } else return res.status(400).json({ error: 'Invalid action' });
  save('disputes', d);
  res.json({ dispute: d });
});

// ================= PUBLIC STATS / IOT =================
app.get('/api/stats', (_req, res) => {
  const s = engine.networkStats();
  res.json({ stations: 1248, online: 986, charging: 421 + s.liveSessions, networks: 27, live: s });
});
app.post('/api/iot/telemetry', (req, res) => {
  // In production this endpoint sits behind MQTT bridge + device auth (X.509 / PSK).
  res.json(engine.ingestTelemetry(req.body || {}));
});
app.post('/api/iot/:chargerId/status', (req, res) => {
  res.json(engine.ingestTelemetry({ charger_id: req.params.chargerId, status: req.body.status, fault: req.body.fault }));
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

app.use('/ocpi', ocpiRouter());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
engine.setIo(io);
engine.startTicker();
attachOcpp(server);
startOcpiSyncLoop(io);
io.on('connection', (socket) => {
  socket.emit('network:stats', engine.networkStats());
});

server.listen(PORT, '0.0.0.0', () => console.log(`⚡ ChargeOne API + WebSocket running on :${PORT}`));
