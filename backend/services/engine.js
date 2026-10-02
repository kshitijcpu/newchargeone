// ChargeOne simulation engine — payment state machine, live charging sessions,
// charger telemetry ticks, demo scenarios, ESP32 ingest. Emits Socket.IO events.
import { db, nextId, audit, notify } from '../data/store.js';
import { save, commit } from './persistence.js';
import { providerRefund } from './provider.js';

let io = null;
export const setIo = (s) => { io = s; };
const emit = (ev, data) => io && io.emit(ev, data);

// ---------- Payment state machine ----------
const TRANSITIONS = {
  CREATED: ['INITIATED'],
  INITIATED: ['AUTHORIZED', 'FAILED'],
  AUTHORIZED: ['CHARGER_CHECK'],
  CHARGER_CHECK: ['STARTED', 'FAILED'],
  STARTED: ['CHARGING'],
  CHARGING: ['COMPLETED', 'FAILED'],
  COMPLETED: ['SETTLED'],
  FAILED: ['REFUND_PENDING'],
  REFUND_PENDING: ['REFUND_PROCESSING'],
  REFUND_PROCESSING: ['REFUNDED'],
};

export function transition(payment, to, note) {
  const from = payment.status;
  if (from && !(TRANSITIONS[from] || []).includes(to)) {
    // still record but flag — keeps the demo resilient
    audit('PAYMENT', payment.id, from, to, `(forced) ${note}`);
  } else {
    audit('PAYMENT', payment.id, from, to, note);
  }
  payment.status = to;
  payment.timeline.push({ state: to, note, at: new Date().toISOString() });
  save('payments', payment);
  emit('payment:update', { id: payment.id, status: to, note });
  return payment;
}

export function createPayment({ user, station, charger, amount, method }) {
  const p = {
    id: nextId.payment(), sessionId: null, userId: user.id, userName: user.name,
    stationId: station.id, stationName: station.name, operatorName: station.operatorName,
    chargerCode: charger.code, connector: charger.connector,
    amountAuthorized: amount, amountFinal: 0, amountReleased: 0, taxes: 0,
    provider: 'Razorpay (sandbox)', method: method || 'UPI',
    status: null, createdAt: new Date().toISOString(), timeline: [],
  };
  db.payments.unshift(p);
  transition(p, 'CREATED', 'Payment record created');
  transition(p, 'INITIATED', `Payment of ₹${amount} initiated via ${p.method}`);
  transition(p, 'AUTHORIZED', `₹${amount} authorized (hold placed, not captured)`);
  return p;
}

export function createRefund(payment, amount, reason, type, statusSteps) {
  const r = {
    id: nextId.refund(), paymentId: payment.id, sessionId: payment.sessionId,
    userId: payment.userId, userName: payment.userName, stationName: payment.stationName,
    amount, reason, type, status: 'PROCESSING',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    timeline: statusSteps,
  };
  db.refunds.unshift(r);
  commit([['refunds', r], ['payments', payment]]);
  audit('REFUND', r.id, null, 'PROCESSING', reason);
  // Real provider call (sandbox when keys configured, deterministic otherwise)
  providerRefund(payment.providerPaymentId || payment.id, amount, { reason }).then(res => {
    r.providerRefundId = res.refundId;
    save('refunds', r);
    audit('REFUND', r.id, 'PROCESSING', 'PROCESSING', `Provider refund ${res.refundId} (${res.simulated ? 'simulated' : 'sandbox'}) status=${res.status}`);
  }).catch(() => {});
  emit('refund:update', { id: r.id, status: r.status });
  return r;
}

// ---------- Charger helpers ----------
export function chargerPayload(c) {
  return {
    id: c.id, code: c.code, stationId: c.stationId, status: c.status, health: c.health,
    voltage: c.voltage, current: c.current, powerNow: c.powerNow, temperature: c.temperature,
    faultCode: c.faultCode, lastVerifiedMin: c.lastVerifiedMin,
  };
}

export function setChargerStatus(charger, status, faultCode = null, source = 'system') {
  const from = charger.status;
  charger.status = status;
  charger.faultCode = status === 'FAULT' ? (faultCode || 'E-310 COMM_TIMEOUT') : null;
  charger.lastVerifiedMin = 0;
  if (status === 'FAULT') charger.health = Math.min(charger.health, 25 + Math.floor(Math.random() * 15));
  if (status === 'AVAILABLE' && charger.health < 80) charger.health = 82 + Math.floor(Math.random() * 12);
  audit('CHARGER', charger.id, from, status, `Status via ${source}`);
  if (status === 'FAULT') openIncident(charger, source, faultCode);
  emit('charger:update', chargerPayload(charger));
  return charger;
}

// ---------- Incident management ----------
let incSeq = 2300;
export function openIncident(charger, source, faultCode, linkedReportId = null, severity = null) {
  const existing = db.incidents.find(i => i.chargerId === charger.id && i.status !== 'RESOLVED');
  if (existing) {
    existing.timeline.push({ at: new Date().toISOString(), actor: 'system', action: `Recurrence: ${faultCode || 'fault'} via ${source}` });
    existing.updatedAt = new Date().toISOString();
    save('incidents', existing);
    emit('incident:update', { id: existing.id });
    return existing;
  }
  const station = db.stations.find(s => s.id === charger.stationId);
  const sev = severity || (String(faultCode || '').includes('COMM') ? 'P1' : 'P2');
  const inc = {
    id: `INC-${incSeq++}`, operatorId: station?.operatorId, stationId: charger.stationId,
    stationName: station?.name, chargerId: charger.id, chargerCode: charger.code,
    severity: sev, title: `${faultCode || 'Charger fault'} — auto-detected`, source,
    status: 'OPEN', slaMins: sev === 'P1' ? 240 : sev === 'P2' ? 720 : 2880,
    assignee: null, linkedReportId,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    timeline: [{ at: new Date().toISOString(), actor: 'system', action: `Incident auto-created (${source}${faultCode ? ' · ' + faultCode : ''}). SLA ${sev === 'P1' ? '4h' : sev === 'P2' ? '12h' : '48h'}.` }],
  };
  db.incidents.unshift(inc);
  save('incidents', inc);
  const opUser = db.users.find(u => u.role === 'OPERATOR' && u.operatorId === inc.operatorId);
  if (opUser) { notify(opUser.id, `${sev} incident opened`, `${inc.id}: ${inc.title} at ${inc.stationName} (${inc.chargerCode}).`, 'fault'); emit('notification:new', { userId: opUser.id }); }
  emit('incident:update', { id: inc.id });
  return inc;
}

export function incidentAction(inc, action, actor) {
  const MAP = { acknowledge: 'ACKNOWLEDGED', investigate: 'INVESTIGATING', resolve: 'RESOLVED' };
  if (action === 'maintenance') {
    const ch = db.chargers.find(c => c.id === inc.chargerId);
    if (ch) setChargerStatus(ch, 'MAINTENANCE', null, 'incident');
    inc.timeline.push({ at: new Date().toISOString(), actor, action: 'Charger set to MAINTENANCE pending field visit' });
  } else if (MAP[action]) {
    inc.status = MAP[action];
    inc.timeline.push({ at: new Date().toISOString(), actor, action: `Status → ${MAP[action]}` });
    if (action === 'resolve') {
      const ch = db.chargers.find(c => c.id === inc.chargerId);
      if (ch && ['FAULT', 'MAINTENANCE'].includes(ch.status)) setChargerStatus(ch, 'AVAILABLE', null, 'incident-resolved');
      const rep = db.faultReports.find(r => r.id === inc.linkedReportId);
      if (rep) { rep.status = 'RESOLVED'; save('faultReports', rep); }
    }
  }
  inc.updatedAt = new Date().toISOString();
  save('incidents', inc);
  audit('INCIDENT', inc.id, null, inc.status, `${action} by ${actor}`);
  emit('incident:update', { id: inc.id });
  return inc;
}

// ---------- Charging sessions ----------
export function startSession({ user, station, charger, payment, vehicle, forceHandshakeFail = false }) {
  transition(payment, 'CHARGER_CHECK', 'Performing charger handshake before energy delivery');

  const shouldFail = forceHandshakeFail || charger.status === 'FAULT' || charger.status === 'OFFLINE';
  if (shouldFail) {
    transition(payment, 'FAILED', 'Charger handshake failed — session never started. Payment protected.');
    transition(payment, 'REFUND_PENDING', 'Authorization release queued automatically');
    const r = createRefund(payment, payment.amountAuthorized, 'Charger handshake failed — charging never started', 'FULL_REVERSAL', [
      { step: 'Payment authorized', done: true, at: new Date().toISOString() },
      { step: 'Charger handshake failed', done: true, at: new Date().toISOString() },
      { step: 'Issue detected by ChargeOne', done: true, at: new Date().toISOString() },
      { step: 'Reversal requested with provider', done: true, at: new Date().toISOString() },
      { step: 'Provider processing', done: false, at: null },
      { step: 'Bank settlement pending', done: false, at: null },
    ]);
    setChargerStatus(charger, 'FAULT', 'E-310 COMM_TIMEOUT', 'handshake');
    setTimeout(() => { transition(payment, 'REFUND_PROCESSING', 'Payment provider processing reversal'); }, 6000);
    notify(user.id, 'Charging not started — payment protected', `Charger handshake failed at ${station.name}. ₹${payment.amountAuthorized} reversal initiated (${r.id}).`, 'refund');
    emit('notification:new', { userId: user.id });
    return { ok: false, payment, refund: r };
  }

  transition(payment, 'STARTED', 'Handshake OK — charging session started');
  const startPct = vehicle ? vehicle.batteryPct : 40;
  const s = {
    id: nextId.session(), userId: user.id, userName: user.name,
    stationId: station.id, stationName: station.name, city: station.city,
    chargerId: charger.id, chargerCode: charger.code, connector: charger.connector, powerKw: charger.powerKw,
    startTime: new Date().toISOString(), endTime: null,
    energyKwh: 0, durationMin: 0, pricePerKwh: charger.pricePerKwh,
    estimatedAmount: payment.amountAuthorized, finalAmount: 0, status: 'CHARGING',
    paymentId: payment.id, startPct, pct: startPct, endPct: null, live: true,
    vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Tata Nexon EV',
    batteryKwh: vehicle ? vehicle.batteryKwh : 40.5, seconds: 0,
  };
  payment.sessionId = s.id;
  db.sessions.unshift(s);
  commit([['sessions', s], ['payments', payment]]);
  setChargerStatus(charger, 'CHARGING', null, 'session');
  transition(payment, 'CHARGING', 'Energy delivery in progress');
  notify(user.id, 'Charging session started', `Session ${s.id} started at ${station.name} (${charger.code}).`, 'session');
  emit('notification:new', { userId: user.id });
  emit('session:started', { id: s.id, userId: user.id });
  return { ok: true, session: s, payment };
}

export function stopSession(session, reason = 'USER_STOP') {
  if (!session.live) return session;
  session.live = false;
  session.endTime = new Date().toISOString();
  session.durationMin = Math.max(1, Math.round(session.seconds / 60));
  const payment = db.payments.find(p => p.id === session.paymentId);
  const charger = db.chargers.find(c => c.id === session.chargerId);
  const finalAmt = +(session.energyKwh * session.pricePerKwh).toFixed(2);
  session.finalAmount = finalAmt;
  session.endPct = Math.round(session.pct);

  if (reason === 'FAULT') {
    session.status = 'INTERRUPTED';
    if (charger) setChargerStatus(charger, 'FAULT', 'E-221 OVER_TEMP', 'session-fault');
    if (payment) {
      transition(payment, 'FAILED', `Charging interrupted at ${session.energyKwh.toFixed(1)} kWh — partial delivery`);
      transition(payment, 'REFUND_PENDING', `₹${(payment.amountAuthorized - finalAmt).toFixed(2)} unused authorization queued for release`);
      payment.amountFinal = finalAmt;
      payment.amountReleased = +(payment.amountAuthorized - finalAmt).toFixed(2);
      createRefund(payment, payment.amountReleased, 'Charging interrupted — unused authorized amount', 'PARTIAL_RELEASE', [
        { step: 'Session interrupted', done: true, at: new Date().toISOString() },
        { step: 'Delivered energy calculated', done: true, at: new Date().toISOString() },
        { step: 'Unused amount release requested', done: true, at: new Date().toISOString() },
        { step: 'Provider processing', done: false, at: null },
        { step: 'Bank settlement pending', done: false, at: null },
      ]);
      setTimeout(() => transition(payment, 'REFUND_PROCESSING', 'Provider processing partial release'), 6000);
    }
    commit([['sessions', session], payment && ['payments', payment]].filter(Boolean));
    notify(session.userId, 'Charging session interrupted', `Session at ${session.stationName} stopped unexpectedly at ${Math.round(session.pct)}%. Unused amount release initiated.`, 'fault');
  } else {
    session.status = 'COMPLETED';
    if (charger) setChargerStatus(charger, 'AVAILABLE', null, 'session-complete');
    if (payment) {
      transition(payment, 'COMPLETED', `Session complete — ${session.energyKwh.toFixed(1)} kWh delivered`);
      payment.amountFinal = finalAmt;
      payment.amountReleased = +(payment.amountAuthorized - finalAmt).toFixed(2);
      payment.taxes = +(finalAmt * 0.18 / 1.18).toFixed(2);
      transition(payment, 'SETTLED', `₹${finalAmt} captured, ₹${payment.amountReleased} released to source`);
      if (payment.amountReleased > 1) {
        createRefund(payment, payment.amountReleased, 'Unused authorized amount released after session', 'PARTIAL_RELEASE', [
          { step: 'Session completed', done: true, at: new Date().toISOString() },
          { step: 'Final amount calculated', done: true, at: new Date().toISOString() },
          { step: 'Unused amount release requested', done: true, at: new Date().toISOString() },
          { step: 'Provider processing', done: false, at: null },
          { step: 'Bank settlement pending', done: false, at: null },
        ]);
      }
    }
    const u = db.users.find(u => u.id === session.userId);
    let wt = null;
    if (u) {
      u.walletBalance = +(u.walletBalance - 0).toFixed(2);
      wt = { id: nextId.wallet(), userId: u.id, label: `Charging — ${session.stationName}`, amount: -finalAmt, at: new Date().toISOString() };
      db.walletTxns.unshift(wt);
    }
    // ACID commit: session + payment + wallet move together or not at all
    commit([['sessions', session], ['payments', payment], u && ['users', u], wt && ['walletTxns', wt]].filter(Boolean));
    notify(session.userId, 'Charging session complete', `${session.energyKwh.toFixed(1)} kWh delivered at ${session.stationName}. Final amount ₹${finalAmt}.`, 'session');
  }
  emit('notification:new', { userId: session.userId });
  emit('session:update', sessionPayload(session));
  return session;
}

export function sessionPayload(s) {
  return {
    id: s.id, status: s.status, live: s.live, pct: +(+s.pct).toFixed(1),
    energyKwh: +s.energyKwh.toFixed(2), powerNow: s.powerNow || 0,
    voltage: s.voltage || 0, current: s.current || 0,
    seconds: s.seconds || 0, estimatedCost: +(s.energyKwh * s.pricePerKwh).toFixed(2),
    finalAmount: s.finalAmount, stationName: s.stationName, chargerCode: s.chargerCode,
    connector: s.connector, powerKw: s.powerKw, pricePerKwh: s.pricePerKwh,
    estimatedAmount: s.estimatedAmount, userId: s.userId, startTime: s.startTime,
  };
}

// ---------- Live tick ----------
export function startTicker() {
  setInterval(() => {
    // advance live sessions (accelerated ~12x for visualization)
    for (const s of db.sessions.filter(x => x.live)) {
      s.seconds += 2;
      const maxKw = Math.min(s.powerKw, 60);
      const taper = s.pct > 80 ? 0.45 : 1;
      const kw = +(maxKw * taper * (0.88 + Math.random() * 0.14)).toFixed(1);
      s.powerNow = kw;
      s.voltage = Math.round(380 + Math.random() * 22);
      s.current = +((kw * 1000) / s.voltage).toFixed(1);
      const dE = (kw / 3600) * 2 * 12; // 12x accelerated
      s.energyKwh += dE;
      s.pct = Math.min(100, s.pct + (dE / s.batteryKwh) * 100);
      const cost = s.energyKwh * s.pricePerKwh;
      const ch = db.chargers.find(c => c.id === s.chargerId);
      if (ch) { ch.powerNow = kw; ch.voltage = s.voltage; ch.current = s.current; ch.temperature = +(34 + Math.random() * 6).toFixed(1); }
      if (s.pct >= 100 || cost >= s.estimatedAmount) stopSession(s, 'AUTO_COMPLETE');
      else emit('session:update', sessionPayload(s));
    }
    // occasional background flicker in the network for liveliness
    if (Math.random() < 0.35) {
      const candidates = db.chargers.filter(c => !db.sessions.some(s => s.live && s.chargerId === c.id));
      const c = candidates[Math.floor(Math.random() * candidates.length)];
      if (c) {
        const r = Math.random();
        if (c.status === 'OCCUPIED' && r < 0.4) setChargerStatus(c, 'AVAILABLE', null, 'telemetry');
        else if (c.status === 'AVAILABLE' && r < 0.18) setChargerStatus(c, 'OCCUPIED', null, 'telemetry');
        else if (c.status === 'OFFLINE' && r < 0.15) setChargerStatus(c, 'AVAILABLE', null, 'telemetry');
        else { c.lastVerifiedMin = Math.min(30, c.lastVerifiedMin + 1); }
      }
    }
    emit('network:stats', networkStats());
  }, 2000);
}

export function networkStats() {
  const total = db.chargers.length;
  const online = db.chargers.filter(c => !['OFFLINE', 'MAINTENANCE'].includes(c.status)).length;
  const charging = db.chargers.filter(c => c.status === 'CHARGING').length + db.sessions.filter(s => s.live).length;
  const fault = db.chargers.filter(c => c.status === 'FAULT').length;
  return { stations: db.stations.length, chargers: total, online, charging, fault, liveSessions: db.sessions.filter(s => s.live).length };
}

// ---------- ESP32 / IoT ingest ----------
export function ingestTelemetry(body) {
  const c = db.chargers.find(x => x.id === body.charger_id || x.code === body.charger_id);
  if (!c) return { ok: false, error: 'Unknown charger_id' };
  if (body.status) setChargerStatus(c, body.status.toUpperCase(), body.fault, 'ESP32');
  if (body.voltage != null) c.voltage = body.voltage;
  if (body.current != null) c.current = body.current;
  if (body.power_kw != null) c.powerNow = body.power_kw;
  if (body.temperature != null) c.temperature = body.temperature;
  emit('charger:update', chargerPayload(c));
  audit('IOT', c.id, null, c.status, `ESP32 telemetry frame received (${JSON.stringify(body).slice(0, 120)})`);
  return { ok: true, charger: chargerPayload(c) };
}
