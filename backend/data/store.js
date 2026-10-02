import { buildSeed } from './seed.js';
import { save } from '../services/persistence.js';

export const db = buildSeed();

let seq = { pay: 483, refund: 10292, booking: 10292, report: 48292, session: 102940, nt: 9000, al: 90000, wt: 7000 };
export const nextId = {
  payment: () => `CO-2026-000${seq.pay++}`,
  refund: () => `CO-RF-${seq.refund++}`,
  booking: () => `CO-BKG-${seq.booking++}`,
  report: () => `CO-${seq.report++}`,
  session: () => `CS_${seq.session++}`,
  notif: () => `NT_${seq.nt++}`,
  audit: () => `AL_${seq.al++}`,
  wallet: () => `WT_${seq.wt++}`,
};

export function audit(entityType, entityId, from, to, note, actor = 'system') {
  const entry = { id: nextId.audit(), entityType, entityId, from, to, note, at: new Date().toISOString(), actor };
  db.auditLogs.push(entry);
  save('auditLogs', entry);
}

export function notify(userId, title, body, type = 'info') {
  const n = { id: nextId.notif(), userId, title, body, type, read: false, at: new Date().toISOString() };
  db.notifications.unshift(n);
  save('notifications', n);
  return n;
}

export function auditPersist(entry) { save('auditLogs', entry); }

export function publicStation(s) {
  const chargers = db.chargers.filter(c => c.stationId === s.id);
  const available = chargers.filter(c => c.status === 'AVAILABLE').length;
  const occupied = chargers.filter(c => c.status === 'OCCUPIED' || c.status === 'CHARGING').length;
  const fault = chargers.filter(c => c.status === 'FAULT').length;
  const offline = chargers.filter(c => c.status === 'OFFLINE' || c.status === 'MAINTENANCE').length;
  const health = Math.round(chargers.reduce((a, c) => a + c.health, 0) / (chargers.length || 1));
  const maxPower = Math.max(...chargers.map(c => c.powerKw));
  const connectors = [...new Set(chargers.map(c => c.connector))];
  const minVerified = Math.min(...chargers.map(c => c.lastVerifiedMin));
  const status = fault > 0 && available === 0 ? 'FAULT' : available > 0 ? 'AVAILABLE' : occupied > 0 ? 'BUSY' : 'OFFLINE';
  return { ...s, chargers, counts: { total: chargers.length, available, occupied, fault, offline }, health, maxPower, connectors, lastVerifiedMin: minVerified, status };
}
