// ChargeOne — availability & demand forecasting.
// Deterministic model for the prototype: seeded per-station demand curves
// (morning + evening peaks, weekday factor) blended with live occupancy.
// Production path: gradient-boosted model over charger_status history,
// session starts, weather and holiday calendars, retrained nightly.
import { db, publicStation } from '../data/store.js';

const seedOf = (id) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0);

/** Expected utilization (0..1) for a station at a given hour. */
export function utilizationAt(stationId, hour, dow = new Date().getDay()) {
  const s = seedOf(stationId);
  const morning = Math.exp(-((hour - 9.5) ** 2) / 6);           // 9-11 am peak
  const evening = Math.exp(-((hour - 19.5) ** 2) / 5) * 1.25;   // 6-10 pm peak
  const base = 0.22 + ((s % 17) / 17) * 0.18;
  const weekday = dow === 0 || dow === 6 ? 0.85 : 1;
  const noise = ((s * (hour + 1) * 2654435761) % 1000) / 1000 * 0.12;
  return Math.min(0.97, (base + 0.5 * (morning + evening)) * weekday + noise);
}

/** Next-N-hour availability forecast for a station. */
export function stationForecast(stationId, hours = 8) {
  const st = db.stations.find(x => x.id === stationId);
  if (!st) return null;
  const ps = publicStation(st);
  const now = new Date();
  const liveOccupancy = ps.counts.total ? (ps.counts.occupied + ps.counts.fault) / ps.counts.total : 0.4;
  const out = [];
  for (let i = 0; i < hours; i++) {
    const h = (now.getHours() + i) % 24;
    let util = utilizationAt(stationId, h);
    if (i === 0) util = util * 0.4 + liveOccupancy * 0.6;       // blend live state
    else if (i === 1) util = util * 0.7 + liveOccupancy * 0.3;
    const freeProb = Math.max(0.03, 1 - util);
    out.push({
      hour: `${String(h).padStart(2, '0')}:00`,
      availabilityPct: Math.round(freeProb * 100),
      predictedFree: Math.max(0, Math.round(ps.counts.total * freeProb)),
      expectedWaitMin: freeProb > 0.5 ? 0 : Math.round((1 - freeProb) * 22),
      band: freeProb > 0.6 ? 'HIGH' : freeProb > 0.35 ? 'MEDIUM' : 'LOW',
    });
  }
  const best = [...out].sort((a, b) => b.availabilityPct - a.availabilityPct)[0];
  return {
    stationId, generatedAt: now.toISOString(), horizonHours: hours, points: out,
    bestWindow: best.hour, bestAvailabilityPct: best.availabilityPct,
    model: 'chargeone-demand-v1 (demo)', confidence: 0.78,
  };
}

/** Availability probability at a future ETA (used by the route planner). */
export function forecastAtEta(stationId, etaMinutes) {
  const h = (new Date().getHours() + Math.floor(etaMinutes / 60)) % 24;
  const util = utilizationAt(stationId, h);
  const p = Math.max(0.03, 1 - util);
  return { availabilityPct: Math.round(p * 100), band: p > 0.6 ? 'HIGH' : p > 0.35 ? 'MEDIUM' : 'LOW' };
}

/** Network-wide demand forecast (admin analytics). */
export function networkForecast() {
  const now = new Date();
  return [...Array(12)].map((_, i) => {
    const h = (now.getHours() + i) % 24;
    const avg = db.stations.reduce((a, s) => a + utilizationAt(s.id, h), 0) / db.stations.length;
    return {
      hour: `${String(h).padStart(2, '0')}:00`,
      predictedUtilization: Math.round(avg * 100),
      predictedSessions: Math.round(140 + avg * 420),
      predictedPeakMw: +(2.1 + avg * 6.4).toFixed(1),
    };
  });
}
