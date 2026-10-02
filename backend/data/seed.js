// ChargeOne — realistic simulated seed data for the competition prototype
let idc = 1000;
const nid = (p) => `${p}_${idc++}`;

const OPERATORS = [
  { id: 'OP_1', name: 'Tata Power EZ Charge', code: 'TPEZ', color: '#3B82F6', stations: 0, status: 'ACTIVE', joined: '2025-02-11' },
  { id: 'OP_2', name: 'Statiq', code: 'STQ', color: '#8B5CF6', stations: 0, status: 'ACTIVE', joined: '2025-03-04' },
  { id: 'OP_3', name: 'ChargeZone', code: 'CZ', color: '#F59E0B', stations: 0, status: 'ACTIVE', joined: '2025-01-22' },
  { id: 'OP_4', name: 'Ather Grid', code: 'ATH', color: '#22D3EE', stations: 0, status: 'ACTIVE', joined: '2025-05-19' },
  { id: 'OP_5', name: 'Jio-bp Pulse', code: 'JBP', color: '#10B981', stations: 0, status: 'ACTIVE', joined: '2025-04-02' },
  { id: 'OP_6', name: 'Zeon Charging', code: 'ZEO', color: '#EC4899', stations: 0, status: 'PENDING', joined: '2026-09-12' },
];

const CITIES = {
  Mumbai: { lat: 19.076, lng: 72.8777 },
  'Navi Mumbai': { lat: 19.033, lng: 73.0297 },
  Thane: { lat: 19.2183, lng: 72.9781 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
};

const STATION_DEFS = [
  // Mumbai
  ['Andheri East Hub', 'Mumbai', 19.1136, 72.8697, 'OP_1', 'MIDC Central Road, Andheri East, Mumbai 400093'],
  ['Bandra Kurla Complex', 'Mumbai', 19.0654, 72.8691, 'OP_2', 'G Block BKC, Bandra East, Mumbai 400051'],
  ['Mumbai Airport T2', 'Mumbai', 19.0974, 72.8745, 'OP_1', 'CSMIA Terminal 2 P4 Parking, Mumbai 400099'],
  ['Lower Parel Supercharge', 'Mumbai', 18.9977, 72.8296, 'OP_3', 'Senapati Bapat Marg, Lower Parel, Mumbai 400013'],
  ['Powai Lakeside', 'Mumbai', 19.1197, 72.9051, 'OP_5', 'Hiranandani Gardens, Powai, Mumbai 400076'],
  ['Worli Sea Face', 'Mumbai', 19.0176, 72.8151, 'OP_2', 'Khan Abdul Gaffar Khan Rd, Worli, Mumbai 400018'],
  ['Malad Infinity Park', 'Mumbai', 19.1874, 72.8484, 'OP_3', 'Link Road, Malad West, Mumbai 400064',],
  ['Chembur Diamond Garden', 'Mumbai', 19.0522, 72.9005, 'OP_5', 'Sion-Trombay Rd, Chembur, Mumbai 400071'],
  // Navi Mumbai
  ['Vashi Palm Beach', 'Navi Mumbai', 19.0771, 72.9987, 'OP_1', 'Palm Beach Rd, Sector 17, Vashi 400703'],
  ['Kharghar Central Park', 'Navi Mumbai', 19.0434, 73.0674, 'OP_2', 'Sector 21, Kharghar, Navi Mumbai 410210'],
  ['Nerul Seawoods Grand', 'Navi Mumbai', 19.0244, 73.0184, 'OP_4', 'Seawoods Grand Central, Nerul 400706'],
  // Thane
  ['Thane Viviana Hub', 'Thane', 19.2094, 72.9646, 'OP_3', 'Eastern Express Hwy, Thane West 400606'],
  ['Ghodbunder Fast Point', 'Thane', 19.2647, 72.9662, 'OP_5', 'Ghodbunder Rd, Kasarvadavali, Thane 400615'],
  // Pune (route Mumbai→Pune has expressway stop)
  ['Khalapur Expressway Plaza', 'Pune', 18.8049, 73.2606, 'OP_1', 'Mumbai-Pune Expressway, Khalapur Food Mall 410202'],
  ['Lonavala Midway', 'Pune', 18.7546, 73.4062, 'OP_3', 'Old Mumbai-Pune Hwy, Lonavala 410401'],
  ['Hinjewadi Phase 1', 'Pune', 18.5913, 73.738, 'OP_2', 'Rajiv Gandhi Infotech Park, Hinjewadi 411057'],
  ['Koregaon Park Plaza', 'Pune', 18.5362, 73.8939, 'OP_4', 'North Main Rd, Koregaon Park, Pune 411001'],
  ['Baner High Street', 'Pune', 18.559, 73.7868, 'OP_5', 'Baner Rd, Pune 411045'],
  // Bengaluru
  ['Indiranagar 100ft Rd', 'Bengaluru', 12.9784, 77.6408, 'OP_4', '100 Feet Rd, Indiranagar, Bengaluru 560038'],
  ['Whitefield ITPL', 'Bengaluru', 12.9857, 77.7364, 'OP_2', 'ITPL Main Rd, Whitefield, Bengaluru 560066'],
  ['Electronic City Hub', 'Bengaluru', 12.8452, 77.6602, 'OP_3', 'Hosur Rd, Electronic City Phase 1, 560100'],
  ['Koramangala Forum', 'Bengaluru', 12.9345, 77.6116, 'OP_4', 'Hosur Rd, Koramangala, Bengaluru 560029'],
  // Delhi
  ['Connaught Place Central', 'Delhi', 28.6315, 77.2167, 'OP_1', 'Block A, Connaught Place, New Delhi 110001'],
  ['Aerocity Charging Plaza', 'Delhi', 28.5562, 77.10925, 'OP_5', 'Asset Area 4, IGI Aerocity, New Delhi 110037'],
  ['Saket Select City', 'Delhi', 28.5286, 77.2192, 'OP_2', 'District Centre, Saket, New Delhi 110017'],
  ['Gurugram Cyber Hub', 'Delhi', 28.4951, 77.0895, 'OP_3', 'DLF Cyber City, Gurugram 122002'],
  // Hyderabad
  ['HITEC City Junction', 'Hyderabad', 17.4435, 78.3772, 'OP_2', 'HITEC City Main Rd, Madhapur 500081'],
  ['Banjara Hills Rd 12', 'Hyderabad', 17.4126, 78.4484, 'OP_1', 'Road No. 12, Banjara Hills, Hyderabad 500034'],
  ['Gachibowli Stadium', 'Hyderabad', 17.4401, 78.3489, 'OP_5', 'Old Mumbai Hwy, Gachibowli 500032'],
];

const FACILITY_POOL = ['Parking', 'Cafe', 'Restroom', 'Wi-Fi', '24x7', 'Lounge', 'Convenience Store'];
const CONN_TYPES = [
  { type: 'CCS2', powers: [30, 50, 60, 120, 150] },
  { type: 'Type 2', powers: [7.4, 11, 22] },
  { type: 'CHAdeMO', powers: [50] },
];

function rand(a, b) { return a + Math.random() * (b - a); }
function ri(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[ri(0, arr.length - 1)]; }

export function buildSeed() {
  const operators = OPERATORS.map(o => ({ ...o }));
  const stations = [];
  const chargers = [];

  STATION_DEFS.forEach(([name, city, lat, lng, opId, address], si) => {
    const op = operators.find(o => o.id === opId);
    const id = `ST_${200 + si}`;
    const nCh = ri(3, 6);
    const facilities = ['Parking', ...FACILITY_POOL.slice(1).filter(() => Math.random() > 0.45)];
    const station = {
      id, name, city, lat, lng, operatorId: opId, operatorName: op.name, operatorColor: op.color,
      address, rating: +rand(3.7, 4.9).toFixed(1), reviews: ri(48, 620), facilities,
      openHours: facilities.includes('24x7') ? 'Open 24 hours' : '06:00 – 23:00',
      pricePerKwh: pick([11, 12, 13, 14, 15, 16, 18]),
      verified: Math.random() > 0.15,
    };
    op.stations++;
    for (let c = 0; c < nCh; c++) {
      const ct = c < nCh - 1 ? CONN_TYPES[c % 2 === 0 ? 0 : 1] : pick(CONN_TYPES);
      const power = pick(ct.powers);
      const r = Math.random();
      const status = r < 0.55 ? 'AVAILABLE' : r < 0.78 ? 'OCCUPIED' : r < 0.88 ? 'OFFLINE' : r < 0.95 ? 'FAULT' : 'MAINTENANCE';
      const health = status === 'FAULT' ? ri(10, 40) : status === 'OFFLINE' ? ri(30, 60) : status === 'MAINTENANCE' ? ri(50, 70) : ri(82, 99);
      chargers.push({
        id: `CH_${si * 10 + c + 10}`,
        code: `${ct.type.replace(' ', '').toUpperCase()}-${String(c + 1).padStart(2, '0')}`,
        stationId: id, stationName: name, operatorId: opId,
        connector: ct.type, powerKw: power,
        pricePerKwh: station.pricePerKwh,
        status, health,
        healthFactors: {
          successfulSessions: Math.min(100, health + ri(-6, 6)),
          recentAvailability: Math.min(100, health + ri(-8, 8)),
          commUptime: Math.min(100, health + ri(-5, 9)),
          faultFrequency: Math.min(100, health + ri(-10, 5)),
          userReports: Math.min(100, health + ri(-4, 10)),
        },
        lastVerifiedMin: ri(1, 30),
        lastSuccessMin: ri(3, 120),
        lastActiveMin: ri(1, 40),
        sessionsToday: ri(2, 26),
        uptime30d: +rand(88, 99.8).toFixed(1),
        voltage: 0, current: 0, powerNow: 0, temperature: +rand(28, 38).toFixed(1),
        faultCode: status === 'FAULT' ? pick(['E-104 CONNECTOR_LOCK', 'E-221 OVER_TEMP', 'E-310 COMM_TIMEOUT', 'E-118 RELAY_STUCK']) : null,
      });
    }
    station.chargerIds = chargers.filter(ch => ch.stationId === id).map(ch => ch.id);
    stations.push(station);
  });

  const users = [
    { id: 'USR_1842', name: 'Kshitij Sharma', email: 'kshitij@demo.in', password: 'demo123', role: 'USER', phone: '+91 98200 12345', city: 'Mumbai', joined: '2025-06-14', status: 'ACTIVE', walletBalance: 1240.5 },
    { id: 'USR_1901', name: 'Ananya Iyer', email: 'ananya@demo.in', password: 'demo123', role: 'USER', phone: '+91 99870 22331', city: 'Pune', joined: '2025-08-02', status: 'ACTIVE', walletBalance: 640 },
    { id: 'USR_1922', name: 'Rohan Mehta', email: 'rohan@demo.in', password: 'demo123', role: 'USER', phone: '+91 98111 90411', city: 'Delhi', joined: '2025-09-20', status: 'ACTIVE', walletBalance: 210 },
    { id: 'USR_1958', name: 'Sneha Kulkarni', email: 'sneha@demo.in', password: 'demo123', role: 'USER', phone: '+91 90040 55112', city: 'Bengaluru', joined: '2026-01-11', status: 'SUSPENDED', walletBalance: 0 },
    { id: 'USR_OP1', name: 'Tata Power Ops', email: 'operator@demo.in', password: 'demo123', role: 'OPERATOR', operatorId: 'OP_1', phone: '+91 22 6717 1000', city: 'Mumbai', joined: '2025-02-11', status: 'ACTIVE', walletBalance: 0 },
    { id: 'USR_AD1', name: 'ChargeOne Control', email: 'admin@demo.in', password: 'demo123', role: 'ADMIN', phone: '+91 22 4000 0001', city: 'Mumbai', joined: '2025-01-01', status: 'ACTIVE', walletBalance: 0 },
  ];

  const vehicles = [
    { id: 'VH_1', userId: 'USR_1842', name: 'My Nexon', brand: 'Tata', model: 'Nexon EV Long Range', batteryKwh: 40.5, connector: 'CCS2', batteryPct: 68, rangeKm: 218, fullRangeKm: 325, primary: true },
    { id: 'VH_2', userId: 'USR_1842', name: 'Office Atto', brand: 'BYD', model: 'Atto 3', batteryKwh: 60.5, connector: 'CCS2', batteryPct: 45, rangeKm: 190, fullRangeKm: 420, primary: false },
  ];

  // Historic completed / failed sessions + payments + refunds for Kshitij
  const now = Date.now();
  const day = 86400000;
  const hist = [
    { d: 2, st: 'ST_200', kwh: 31.4, dur: 32, rate: 12, status: 'COMPLETED', auth: 500 },
    { d: 5, st: 'ST_201', kwh: 18.2, dur: 24, rate: 12, status: 'COMPLETED', auth: 300 },
    { d: 9, st: 'ST_202', kwh: 0, dur: 0, rate: 12, status: 'FAILED', auth: 500 },
    { d: 14, st: 'ST_204', kwh: 24.6, dur: 41, rate: 14, status: 'COMPLETED', auth: 400 },
    { d: 19, st: 'ST_203', kwh: 12.1, dur: 18, rate: 15, status: 'COMPLETED', auth: 250 },
    { d: 26, st: 'ST_213', kwh: 28.9, dur: 29, rate: 12, status: 'COMPLETED', auth: 400 },
    { d: 33, st: 'ST_200', kwh: 20.4, dur: 26, rate: 12, status: 'COMPLETED', auth: 300 },
  ];
  const sessions = [];
  const payments = [];
  const refunds = [];
  const auditLogs = [];
  let txn = 470;

  const audit = (entityType, entityId, from, to, note, tOffset = 0) => {
    auditLogs.push({ id: nid('AL'), entityType, entityId, from, to, note, at: new Date(now - tOffset).toISOString(), actor: 'system' });
  };

  hist.forEach((h, i) => {
    const stn = stations.find(s => s.id === h.st);
    const ch = chargers.find(c => c.stationId === h.st && c.connector === 'CCS2') || chargers.find(c => c.stationId === h.st);
    const start = now - h.d * day - 3600000;
    const sid = `CS_${102930 + i}`;
    const pid = `CO-2026-000${txn++}`;
    const final = +(h.kwh * h.rate).toFixed(2);
    const ok = h.status === 'COMPLETED';
    sessions.push({
      id: sid, userId: 'USR_1842', userName: 'Kshitij Sharma', stationId: h.st, stationName: stn.name, city: stn.city,
      chargerId: ch.id, chargerCode: ch.code, connector: ch.connector, powerKw: ch.powerKw,
      startTime: new Date(start).toISOString(), endTime: ok ? new Date(start + h.dur * 60000).toISOString() : null,
      energyKwh: h.kwh, durationMin: h.dur, pricePerKwh: h.rate,
      estimatedAmount: h.auth, finalAmount: ok ? final : 0, status: h.status,
      paymentId: pid, startPct: ri(20, 45), endPct: ri(60, 92), live: false,
    });
    const pay = {
      id: pid, sessionId: sid, userId: 'USR_1842', userName: 'Kshitij Sharma',
      stationId: h.st, stationName: stn.name, operatorName: stn.operatorName,
      chargerCode: ch.code, connector: ch.connector,
      amountAuthorized: h.auth, amountFinal: ok ? final : 0,
      amountReleased: ok ? +(h.auth - final).toFixed(2) : h.auth,
      taxes: ok ? +(final * 0.18 / 1.18).toFixed(2) : 0,
      provider: 'Razorpay (sandbox)', method: pick(['UPI', 'Card', 'Wallet']),
      status: ok ? 'SETTLED' : 'REFUNDED',
      createdAt: new Date(start - 240000).toISOString(),
      timeline: ok
        ? [
            ['CREATED', 'Payment created', start - 240000],
            ['INITIATED', 'Payment initiated by user', start - 220000],
            ['AUTHORIZED', `₹${h.auth} authorized (not captured)`, start - 180000],
            ['CHARGER_CHECK', 'Charger handshake verified', start - 120000],
            ['STARTED', 'Charging session started', start - 60000],
            ['CHARGING', 'Energy delivery in progress', start],
            ['COMPLETED', `Session complete — ${h.kwh} kWh delivered`, start + h.dur * 60000],
            ['SETTLED', `₹${final} captured, ₹${(h.auth - final).toFixed(2)} released`, start + h.dur * 60000 + 90000],
          ].map(([state, note, t]) => ({ state, note, at: new Date(t).toISOString() }))
        : [
            ['CREATED', 'Payment created', start - 240000],
            ['INITIATED', 'Payment initiated by user', start - 220000],
            ['AUTHORIZED', `₹${h.auth} authorized (not captured)`, start - 180000],
            ['CHARGER_CHECK', 'Charger handshake attempted', start - 120000],
            ['FAILED', 'Charger handshake failed — E-310 COMM_TIMEOUT', start - 100000],
            ['REFUND_PENDING', 'Authorization release queued automatically', start - 90000],
            ['REFUND_PROCESSING', 'Payment provider processing reversal', start - 40000],
            ['REFUNDED', `₹${h.auth} released to source account`, start + 2 * day],
          ].map(([state, note, t]) => ({ state, note, at: new Date(t).toISOString() })),
    };
    payments.push(pay);
    pay.timeline.forEach((t, j) => audit('PAYMENT', pid, j ? pay.timeline[j - 1].state : null, t.state, t.note, now - new Date(t.at).getTime()));
    if (!ok) {
      refunds.push({
        id: 'CO-RF-10291', paymentId: pid, sessionId: sid, userId: 'USR_1842', userName: 'Kshitij Sharma',
        amount: h.auth, reason: 'Charger handshake failed — charging never started', type: 'FULL_REVERSAL',
        status: 'COMPLETED', createdAt: new Date(start - 90000).toISOString(), updatedAt: new Date(start + 2 * day).toISOString(),
        stationName: stn.name,
        timeline: [
          { step: 'Payment authorized', done: true, at: new Date(start - 180000).toISOString() },
          { step: 'Charger handshake failed', done: true, at: new Date(start - 100000).toISOString() },
          { step: 'Issue detected by ChargeOne', done: true, at: new Date(start - 95000).toISOString() },
          { step: 'Reversal requested with provider', done: true, at: new Date(start - 40000).toISOString() },
          { step: 'Provider processing', done: true, at: new Date(start + day).toISOString() },
          { step: 'Bank settlement complete', done: true, at: new Date(start + 2 * day).toISOString() },
        ],
      });
    } else if (h.auth - final > 1) {
      refunds.push({
        id: `CO-RF-${10280 + i}`, paymentId: pid, sessionId: sid, userId: 'USR_1842', userName: 'Kshitij Sharma',
        amount: +(h.auth - final).toFixed(2), reason: 'Unused authorized amount released after session', type: 'PARTIAL_RELEASE',
        status: i < 2 ? 'PROCESSING' : 'COMPLETED', createdAt: new Date(start + h.dur * 60000).toISOString(),
        updatedAt: new Date(start + h.dur * 60000 + (i < 2 ? 0 : day)).toISOString(), stationName: stn.name,
        timeline: [
          { step: 'Session completed', done: true, at: new Date(start + h.dur * 60000).toISOString() },
          { step: 'Final amount calculated', done: true, at: new Date(start + h.dur * 60000 + 30000).toISOString() },
          { step: 'Unused amount release requested', done: true, at: new Date(start + h.dur * 60000 + 60000).toISOString() },
          { step: 'Provider processing', done: i >= 2, at: i >= 2 ? new Date(start + h.dur * 60000 + 3600000).toISOString() : null },
          { step: 'Bank settlement complete', done: i >= 2, at: i >= 2 ? new Date(start + h.dur * 60000 + day).toISOString() : null },
        ],
      });
    }
  });

  const notifications = [
    { id: nid('NT'), userId: 'USR_1842', title: 'Refund completed', body: 'Refund CO-RF-10291 of ₹500.00 has been settled to your source account.', type: 'refund', read: false, at: new Date(now - 2 * 3600000).toISOString() },
    { id: nid('NT'), userId: 'USR_1842', title: 'Charger available', body: 'Charger CCS2-01 at Andheri East Hub is now available.', type: 'charger', read: false, at: new Date(now - 5 * 3600000).toISOString() },
    { id: nid('NT'), userId: 'USR_1842', title: 'Session complete', body: 'Your charging session at Andheri East Hub is complete. Final amount ₹376.80.', type: 'session', read: true, at: new Date(now - 2 * day).toISOString() },
    { id: nid('NT'), userId: 'USR_1842', title: 'Adjustment processing', body: '₹123.20 unused authorization is being released to your account.', type: 'refund', read: true, at: new Date(now - 2 * day).toISOString() },
    { id: nid('NT'), userId: 'USR_1842', title: 'Fault report received', body: 'Your report CO-48291 is under verification. The charger is marked "Under verification" for other users.', type: 'fault', read: true, at: new Date(now - 4 * day).toISOString() },
  ];

  const walletTxns = [
    { id: nid('WT'), userId: 'USR_1842', label: 'Refund — CO-RF-10291', amount: 500, at: new Date(now - 2 * 3600000).toISOString() },
    { id: nid('WT'), userId: 'USR_1842', label: 'Charging — Andheri East Hub', amount: -376.8, at: new Date(now - 2 * day).toISOString() },
    { id: nid('WT'), userId: 'USR_1842', label: 'Money added via UPI', amount: 200, at: new Date(now - 3 * day).toISOString() },
    { id: nid('WT'), userId: 'USR_1842', label: 'Charging — Bandra Kurla Complex', amount: -218.4, at: new Date(now - 5 * day).toISOString() },
    { id: nid('WT'), userId: 'USR_1842', label: 'Money added via Card', amount: 1000, at: new Date(now - 9 * day).toISOString() },
  ];

  const faultReports = [
    { id: 'CO-48291', userId: 'USR_1842', userName: 'Kshitij Sharma', stationId: 'ST_202', stationName: 'Mumbai Airport T2', chargerId: 'CH_30', chargerCode: 'CCS2-01', issue: "Charger won't start", description: 'Connector locked but session never began after payment authorization.', status: 'UNDER_VERIFICATION', photo: true, createdAt: new Date(now - 4 * day).toISOString() },
    { id: 'CO-48277', userId: 'USR_1901', userName: 'Ananya Iyer', stationId: 'ST_215', stationName: 'Hinjewadi Phase 1', chargerId: 'CH_60', chargerCode: 'TYPE2-02', issue: 'Display not working', description: 'Screen blank, charging works via app only.', status: 'ASSIGNED_TO_OPERATOR', photo: false, createdAt: new Date(now - 6 * day).toISOString() },
    { id: 'CO-48254', userId: 'USR_1922', userName: 'Rohan Mehta', stationId: 'ST_222', stationName: 'Connaught Place Central', chargerId: 'CH_130', chargerCode: 'CCS2-01', issue: 'Connector damaged', description: 'CCS2 latch broken, does not lock into vehicle.', status: 'RESOLVED', photo: true, createdAt: new Date(now - 11 * day).toISOString() },
  ];

  const disputes = [
    {
      id: 'DP-10291', userId: 'USR_1842', userName: 'Kshitij Sharma', stationId: 'ST_202', stationName: 'Mumbai Airport T2',
      operatorName: 'Tata Power EZ Charge', issue: "Paid but charger didn't start", amount: 500, status: 'RESOLVED',
      paymentId: payments.find(p => p.status === 'REFUNDED')?.id, createdAt: new Date(now - 9 * day).toISOString(),
      evidence: ['Payment authorization record', 'Charger status log (E-310 COMM_TIMEOUT)', 'Session handshake logs', 'Fault report CO-48291', 'Operator response — confirmed modem failure'],
      timeline: [
        { step: 'Payment authorized', done: true }, { step: 'Charger check failed', done: true },
        { step: 'User report filed', done: true }, { step: 'Operator response received', done: true },
        { step: 'Resolution — full reversal completed', done: true },
      ],
    },
    {
      id: 'DP-10304', userId: 'USR_1922', userName: 'Rohan Mehta', stationId: 'ST_223', stationName: 'Aerocity Charging Plaza',
      operatorName: 'Jio-bp Pulse', issue: 'Session ended early, billed for full estimate', amount: 180, status: 'AWAITING_OPERATOR',
      paymentId: null, createdAt: new Date(now - 2 * day).toISOString(),
      evidence: ['Payment capture record', 'Session log — terminated at 41%', 'Charger telemetry snapshot'],
      timeline: [
        { step: 'Payment captured', done: true }, { step: 'Session interrupted', done: true },
        { step: 'User report filed', done: true }, { step: 'Operator response pending', done: false },
        { step: 'Resolution', done: false },
      ],
    },
  ];

  const bookings = [
    { id: 'CO-BKG-10291', userId: 'USR_1842', stationId: 'ST_200', stationName: 'Andheri East Hub', chargerId: 'CH_10', chargerCode: 'CCS2-01', connector: 'CCS2', powerKw: 60, date: new Date(now + day).toISOString().slice(0, 10), startTime: '18:30', durationMin: 45, status: 'CONFIRMED', createdAt: new Date(now - 3600000).toISOString() },
  ];

  const favorites = [{ userId: 'USR_1842', stationId: 'ST_200' }, { userId: 'USR_1842', stationId: 'ST_201' }, { userId: 'USR_1842', stationId: 'ST_213' }];

  const reviews = [
    { id: nid('RV'), stationId: 'ST_200', userName: 'Ananya I.', rating: 5, text: 'Charger started first try, health score was spot on.', at: new Date(now - 3 * day).toISOString() },
    { id: nid('RV'), stationId: 'ST_200', userName: 'Vikram S.', rating: 4, text: 'Good uptime, cafe nearby while waiting.', at: new Date(now - 8 * day).toISOString() },
  ];

  const incidents = [
    {
      id: 'INC-2201', operatorId: 'OP_1', stationId: 'ST_202', stationName: 'Mumbai Airport T2', chargerId: 'CH_30', chargerCode: 'CCS2-01',
      severity: 'P1', title: 'Charger handshake failures — comm timeout', source: 'telemetry',
      status: 'INVESTIGATING', slaMins: 240, assignee: 'Field team West-2', linkedReportId: 'CO-48291',
      createdAt: new Date(now - 4 * day).toISOString(), updatedAt: new Date(now - 3 * day).toISOString(),
      timeline: [
        { at: new Date(now - 4 * day).toISOString(), actor: 'system', action: 'Incident auto-created from fault report CO-48291 + telemetry E-310' },
        { at: new Date(now - 4 * day + 3600000).toISOString(), actor: 'operator@demo.in', action: 'Acknowledged — SLA clock running' },
        { at: new Date(now - 3 * day).toISOString(), actor: 'Field team West-2', action: 'On-site: 4G modem suspected, replacement ordered' },
      ],
    },
    {
      id: 'INC-2188', operatorId: 'OP_1', stationId: 'ST_200', stationName: 'Andheri East Hub', chargerId: 'CH_12', chargerCode: 'TYPE2-02',
      severity: 'P3', title: 'Display intermittently blank', source: 'user-report',
      status: 'ACKNOWLEDGED', slaMins: 2880, assignee: null, linkedReportId: null,
      createdAt: new Date(now - 2 * day).toISOString(), updatedAt: new Date(now - 2 * day).toISOString(),
      timeline: [
        { at: new Date(now - 2 * day).toISOString(), actor: 'system', action: 'Incident created from user report' },
        { at: new Date(now - 2 * day + 1800000).toISOString(), actor: 'operator@demo.in', action: 'Acknowledged — charging unaffected, scheduled with next visit' },
      ],
    },
    {
      id: 'INC-2164', operatorId: 'OP_1', stationId: 'ST_208', stationName: 'Vashi Palm Beach', chargerId: 'CH_90', chargerCode: 'CCS2-01',
      severity: 'P2', title: 'Repeated relay fault E-118', source: 'telemetry',
      status: 'RESOLVED', slaMins: 720, assignee: 'Field team NM-1', linkedReportId: null,
      createdAt: new Date(now - 9 * day).toISOString(), updatedAt: new Date(now - 7 * day).toISOString(),
      timeline: [
        { at: new Date(now - 9 * day).toISOString(), actor: 'system', action: 'Incident auto-created — 3× E-118 RELAY_STUCK in 24h' },
        { at: new Date(now - 9 * day + 900000).toISOString(), actor: 'operator@demo.in', action: 'Acknowledged, charger set to MAINTENANCE' },
        { at: new Date(now - 8 * day).toISOString(), actor: 'Field team NM-1', action: 'Contactor replaced, 5 test sessions OK' },
        { at: new Date(now - 7 * day).toISOString(), actor: 'operator@demo.in', action: 'Resolved — charger restored to AVAILABLE' },
      ],
    },
  ];

  return { operators, stations, chargers, users, vehicles, sessions, payments, refunds, notifications, walletTxns, faultReports, disputes, bookings, favorites, reviews, auditLogs, incidents };
}
