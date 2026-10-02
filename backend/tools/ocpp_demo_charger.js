#!/usr/bin/env node
/**
 * ChargeOne — OCPP 1.6J demo charge point.
 * A real OCPP-J client that connects to the ChargeOne central system over
 * WebSocket (subprotocol ocpp1.6) and speaks the actual protocol:
 * BootNotification → StatusNotification → Heartbeat loop → MeterValues.
 *
 *   node tools/ocpp_demo_charger.js [chargerId] [wsBase]
 *   e.g. node tools/ocpp_demo_charger.js CH_30 ws://localhost:4000
 *
 * Keys: a=Available c=Charging f=Faulted u=Unavailable q=quit
 * Watch the Admin → Integrations page: the connection, vendor, firmware and
 * message counters appear live; status changes ripple to every map instantly.
 */
import WebSocket from 'ws';

const CHARGER_ID = process.argv[2] || 'CH_30';
const BASE = process.argv[3] || 'ws://localhost:4000';
const ws = new WebSocket(`${BASE}/ocpp/${CHARGER_ID}`, ['ocpp1.6']);

let uid = 0;
let status = 'Available';
let meter = 0;
const call = (action, payload) => {
  const frame = [2, `msg-${++uid}`, action, payload];
  ws.send(JSON.stringify(frame));
  console.log(`→ ${action}`, JSON.stringify(payload));
};

ws.on('open', () => {
  console.log(`⚡ OCPP charge point ${CHARGER_ID} connected to ${BASE} (ocpp1.6)`);
  console.log('Keys: a=Available  c=Charging  f=Faulted  u=Unavailable  q=quit\n');
  call('BootNotification', { chargePointVendor: 'ChargeOne Labs', chargePointModel: 'CO-DC60', firmwareVersion: '1.4.2', chargePointSerialNumber: 'CO-DEMO-0001' });
  call('StatusNotification', { connectorId: 1, status, errorCode: 'NoError' });
  setInterval(() => call('Heartbeat', {}), 15000);
  setInterval(() => {
    if (status !== 'Charging') return;
    const v = 380 + Math.random() * 22, a = 44 + Math.random() * 8;
    meter += (v * a) / 1000 / 720; // kWh per 5s
    call('MeterValues', { connectorId: 1, meterValue: [{ timestamp: new Date().toISOString(), sampledValue: [
      { value: v.toFixed(1), measurand: 'Voltage', unit: 'V' },
      { value: a.toFixed(1), measurand: 'Current.Import', unit: 'A' },
      { value: (v * a).toFixed(0), measurand: 'Power.Active.Import', unit: 'W' },
      { value: meter.toFixed(3), measurand: 'Energy.Active.Import.Register', unit: 'kWh' },
      { value: (33 + Math.random() * 6).toFixed(1), measurand: 'Temperature', unit: 'Celsius' },
    ] }] });
  }, 5000);
});

ws.on('message', (raw) => {
  const [type, id, payloadOrAction, payload] = JSON.parse(raw.toString());
  if (type === 3) console.log(`← CALLRESULT ${id}:`, JSON.stringify(payloadOrAction));
  if (type === 2) { // central system calling us (RemoteStart/Stop)
    console.log(`← CALL ${payloadOrAction}`, JSON.stringify(payload));
    ws.send(JSON.stringify([3, id, { status: 'Accepted' }]));
    if (payloadOrAction === 'RemoteStartTransaction') { status = 'Charging'; call('StatusNotification', { connectorId: 1, status, errorCode: 'NoError' }); }
    if (payloadOrAction === 'RemoteStopTransaction') { status = 'Available'; call('StatusNotification', { connectorId: 1, status, errorCode: 'NoError' }); }
  }
});
ws.on('close', () => { console.log('Disconnected.'); process.exit(0); });
ws.on('error', (e) => { console.error('WS error:', e.message); process.exit(1); });

process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (k) => {
  const s = k.toString();
  if (s === 'q' || s === '\u0003') { ws.close(); return; }
  const map = { a: 'Available', c: 'Charging', f: 'Faulted', u: 'Unavailable' };
  if (map[s]) {
    status = map[s];
    if (status !== 'Charging') meter = 0;
    call('StatusNotification', { connectorId: 1, status, errorCode: status === 'Faulted' ? 'InternalError' : 'NoError' });
    if (status === 'Charging') call('StartTransaction', { connectorId: 1, idTag: 'DEMO', meterStart: Math.round(meter * 1000), timestamp: new Date().toISOString() });
  }
});
