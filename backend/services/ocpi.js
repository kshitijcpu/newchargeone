// ChargeOne — OCPI 2.2 module (eMSP side).
// Exposes /ocpi/2.2/* endpoints so partner CPOs can push/pull data with
// token auth, and keeps a registry of peer networks with sync state.
// In production each peer gets its own credentials exchange (OCPI §7).
import express from 'express';
import { db, audit } from '../data/store.js';
import { publicStation } from '../data/store.js';

const OCPI_TOKEN = process.env.OCPI_TOKEN || 'demo-ocpi-token';

// Peer CPO registry (simulated sync loop updates lastSync)
export const peers = db.operators.filter(o => o.status === 'ACTIVE').map((o, i) => ({
  partyId: o.code, name: o.name, countryCode: 'IN', role: 'CPO',
  versionsUrl: `https://ocpi.${o.code.toLowerCase()}.example/ocpi/versions`,
  version: '2.2', modules: ['locations', 'sessions', 'cdrs', 'tariffs', 'commands'],
  status: 'CONNECTED', lastSync: new Date(Date.now() - (i + 1) * 47000).toISOString(),
  locationsSynced: db.stations.filter(s => s.operatorId === o.id).length,
  pullIntervalSec: 60,
}));

export function startOcpiSyncLoop(io) {
  setInterval(() => {
    const p = peers[Math.floor(Math.random() * peers.length)];
    if (p) {
      p.lastSync = new Date().toISOString();
      p.locationsSynced = db.stations.filter(s => db.operators.find(o => o.code === p.partyId)?.id === s.operatorId).length;
    }
  }, 20000);
}

function tokenAuth(req, res, next) {
  const tok = (req.headers.authorization || '').replace(/^Token\s+/i, '');
  if (tok !== OCPI_TOKEN) return res.status(401).json({ status_code: 2001, status_message: 'Invalid or missing token', timestamp: new Date().toISOString() });
  next();
}

const envelope = (data) => ({ data, status_code: 1000, status_message: 'Success', timestamp: new Date().toISOString() });

// Map ChargeOne station -> OCPI Location object
function toOcpiLocation(s) {
  const ps = publicStation(s);
  return {
    country_code: 'IN', party_id: 'CO1', id: s.id,
    publish: true, name: s.name, address: s.address, city: s.city, country: 'IND',
    coordinates: { latitude: String(s.lat), longitude: String(s.lng) },
    operator: { name: s.operatorName },
    evses: ps.chargers.map(c => ({
      uid: c.id, evse_id: `IN*CO1*E${c.id.replace('CH_', '')}`,
      status: { AVAILABLE: 'AVAILABLE', OCCUPIED: 'CHARGING', CHARGING: 'CHARGING', FAULT: 'OUTOFORDER', OFFLINE: 'UNKNOWN', MAINTENANCE: 'INOPERATIVE' }[c.status] || 'UNKNOWN',
      connectors: [{
        id: '1', standard: c.connector === 'CCS2' ? 'IEC_62196_T2_COMBO' : c.connector === 'Type 2' ? 'IEC_62196_T2' : 'CHADEMO',
        format: 'CABLE', power_type: c.powerKw > 22 ? 'DC' : 'AC_3_PHASE',
        max_electric_power: c.powerKw * 1000,
        tariff_ids: [`T-${s.id}`],
      }],
    })),
    last_updated: new Date().toISOString(),
  };
}

export function ocpiRouter() {
  const r = express.Router();
  r.get('/versions', tokenAuth, (req, res) => res.json(envelope([{ version: '2.2', url: `${req.protocol}://${req.get('host')}/ocpi/2.2` }])));
  r.get('/2.2', tokenAuth, (req, res) => {
    const base = `${req.protocol}://${req.get('host')}/ocpi/2.2`;
    res.json(envelope({ version: '2.2', endpoints: ['locations', 'tariffs', 'sessions', 'cdrs'].map(m => ({ identifier: m, role: 'RECEIVER', url: `${base}/${m}` })) }));
  });
  r.get('/2.2/locations', tokenAuth, (req, res) => {
    audit('OCPI', 'locations', null, 'PULLED', `Peer pulled ${db.stations.length} locations`);
    res.json(envelope(db.stations.map(toOcpiLocation)));
  });
  r.get('/2.2/locations/:id', tokenAuth, (req, res) => {
    const s = db.stations.find(x => x.id === req.params.id);
    if (!s) return res.status(404).json({ status_code: 2003, status_message: 'Unknown location' });
    res.json(envelope(toOcpiLocation(s)));
  });
  r.get('/2.2/tariffs', tokenAuth, (req, res) => res.json(envelope(db.stations.map(s => ({
    country_code: 'IN', party_id: 'CO1', id: `T-${s.id}`, currency: 'INR',
    elements: [{ price_components: [{ type: 'ENERGY', price: s.pricePerKwh, vat: 18, step_size: 1 }] }],
    last_updated: new Date().toISOString(),
  })))));
  return r;
}
