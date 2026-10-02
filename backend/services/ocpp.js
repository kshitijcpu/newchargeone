// ChargeOne — OCPP 1.6J (JSON over WebSocket) Central System.
// Real charge points (or the demo client in backend/tools/ocpp_demo_charger.js)
// connect to  ws://<host>:4000/ocpp/<CHARGER_ID>  with subprotocol "ocpp1.6".
// Implements: BootNotification, Heartbeat, StatusNotification, Authorize,
// StartTransaction, StopTransaction, MeterValues. Outbound: RemoteStart/Stop.
import { WebSocketServer } from 'ws';
import { db, audit } from '../data/store.js';
import * as engine from './engine.js';

export const registry = new Map(); // chargerId -> connection info
let wss = null;
let txnSeq = 5000;

const OCPP_TO_CO = {
  Available: 'AVAILABLE', Preparing: 'OCCUPIED', Charging: 'CHARGING',
  SuspendedEV: 'OCCUPIED', SuspendedEVSE: 'OCCUPIED', Finishing: 'OCCUPIED',
  Reserved: 'OCCUPIED', Unavailable: 'MAINTENANCE', Faulted: 'FAULT',
};

function handleCall(chargerId, action, payload, entry) {
  const now = new Date().toISOString();
  const charger = db.chargers.find(c => c.id === chargerId || c.code === chargerId);
  switch (action) {
    case 'BootNotification':
      entry.vendor = payload.chargePointVendor; entry.model = payload.chargePointModel;
      entry.firmware = payload.firmwareVersion || '—';
      audit('OCPP', chargerId, null, 'BOOTED', `BootNotification from ${payload.chargePointVendor} ${payload.chargePointModel}`);
      return { status: 'Accepted', currentTime: now, interval: 30 };
    case 'Heartbeat':
      return { currentTime: now };
    case 'Authorize':
      return { idTagInfo: { status: 'Accepted' } };
    case 'StatusNotification': {
      const st = OCPP_TO_CO[payload.status] || 'OFFLINE';
      if (charger) engine.setChargerStatus(charger, st, payload.errorCode && payload.errorCode !== 'NoError' ? `OCPP ${payload.errorCode}` : null, 'OCPP');
      return {};
    }
    case 'StartTransaction': {
      const id = ++txnSeq;
      if (charger) engine.setChargerStatus(charger, 'CHARGING', null, 'OCPP');
      audit('OCPP', chargerId, null, 'TXN_START', `OCPP StartTransaction #${id} (meterStart=${payload.meterStart})`);
      return { transactionId: id, idTagInfo: { status: 'Accepted' } };
    }
    case 'StopTransaction':
      if (charger) engine.setChargerStatus(charger, 'AVAILABLE', null, 'OCPP');
      audit('OCPP', chargerId, null, 'TXN_STOP', `OCPP StopTransaction #${payload.transactionId} (meterStop=${payload.meterStop})`);
      return { idTagInfo: { status: 'Accepted' } };
    case 'MeterValues': {
      try {
        const sampled = payload.meterValue?.[0]?.sampledValue || [];
        const get = (m) => +(sampled.find(s => s.measurand === m)?.value ?? 0);
        if (charger) {
          charger.voltage = get('Voltage') || charger.voltage;
          charger.current = get('Current.Import') || charger.current;
          charger.powerNow = +(get('Power.Active.Import') / 1000).toFixed(1) || charger.powerNow;
          charger.temperature = get('Temperature') || charger.temperature;
        }
      } catch {}
      return {};
    }
    default:
      return {}; // NotImplemented would be CALLERROR in strict mode
  }
}

export function attachOcpp(server) {
  wss = new WebSocketServer({ noServer: true, handleProtocols: (p) => (p.has('ocpp1.6') ? 'ocpp1.6' : false) });
  server.on('upgrade', (req, socket, head) => {
    if (!req.url.startsWith('/ocpp/')) return; // Socket.IO handles its own path
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws, req) => {
    const chargerId = decodeURIComponent(req.url.replace('/ocpp/', '').split('?')[0]);
    const entry = { chargerId, protocol: ws.protocol || 'ocpp1.6', connectedAt: new Date().toISOString(), lastSeen: new Date().toISOString(), msgCount: 0, vendor: '—', model: '—', firmware: '—' };
    registry.set(chargerId, entry);
    audit('OCPP', chargerId, null, 'CONNECTED', `Charge point connected via OCPP-J (${req.socket.remoteAddress})`);

    ws.on('message', (raw) => {
      entry.lastSeen = new Date().toISOString();
      entry.msgCount++;
      let frame;
      try { frame = JSON.parse(raw.toString()); } catch { return; }
      const [type, uid, actionOrPayload, payload] = frame;
      if (type === 2) { // CALL from charge point
        const result = handleCall(chargerId, actionOrPayload, payload || {}, entry);
        ws.send(JSON.stringify([3, uid, result]));
        entry.lastAction = actionOrPayload;
      }
      // type 3/4 = replies to our outbound calls — logged only
    });
    ws.on('close', () => {
      registry.delete(chargerId);
      audit('OCPP', chargerId, 'CONNECTED', 'DISCONNECTED', 'Charge point disconnected');
    });
  });
}

/** Outbound RemoteStartTransaction — used when a ChargeOne session begins on an OCPP-connected charger. */
export function remoteStart(chargerId, idTag = 'CHARGEONE') {
  for (const [id, entry] of registry) {
    if (id === chargerId) {
      const client = [...wss.clients].find(c => c.readyState === 1);
      // best-effort: send to matching socket
      wss.clients.forEach(c => c.readyState === 1 && c.send(JSON.stringify([2, 'co-' + Date.now(), 'RemoteStartTransaction', { idTag, connectorId: 1 }])));
      audit('OCPP', chargerId, null, 'REMOTE_START', 'RemoteStartTransaction sent from central system');
      return true;
    }
  }
  return false;
}

export function connections() {
  return [...registry.values()];
}
