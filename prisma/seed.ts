/**
 * ChargeOne production seed (PostgreSQL + Prisma).
 * Mirrors the prototype's in-memory seed (backend/data/seed.js):
 * 6 operators, 29 stations across Mumbai, Navi Mumbai, Thane, Pune,
 * Bengaluru, Delhi and Hyderabad, 3-6 chargers per station, demo users,
 * historic sessions/payments/refunds, and a sample audit trail.
 *
 * Run:  npx prisma migrate dev && npx ts-node prisma/seed.ts
 */
import { PrismaClient, Role, ConnectorType, ChargerStatus, PaymentState } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();
const hash = (pw: string) => createHash('sha256').update('co-salt::' + pw).digest('hex'); // use bcrypt/argon2 in production

async function main() {
  const tata = await prisma.operator.create({ data: { name: 'Tata Power EZ Charge', code: 'TPEZ', color: '#3B82F6' } });
  const statiq = await prisma.operator.create({ data: { name: 'Statiq', code: 'STQ', color: '#8B5CF6' } });

  const user = await prisma.user.create({
    data: { name: 'Kshitij Sharma', email: 'kshitij@demo.in', passwordHash: hash('demo123'), role: Role.USER, city: 'Mumbai', walletBalance: 1240.5 },
  });
  await prisma.user.create({ data: { name: 'Tata Power Ops', email: 'operator@demo.in', passwordHash: hash('demo123'), role: Role.OPERATOR, operatorId: tata.id } });
  await prisma.user.create({ data: { name: 'ChargeOne Control', email: 'admin@demo.in', passwordHash: hash('demo123'), role: Role.ADMIN } });

  await prisma.vehicle.create({
    data: { userId: user.id, name: 'My Nexon', brand: 'Tata', model: 'Nexon EV Long Range', batteryKwh: 40.5, connector: ConnectorType.CCS2, batteryPct: 68, rangeKm: 218, fullRangeKm: 325, isPrimary: true },
  });

  const andheri = await prisma.station.create({
    data: {
      operatorId: tata.id, name: 'Andheri East Hub', city: 'Mumbai',
      address: 'MIDC Central Road, Andheri East, Mumbai 400093',
      lat: 19.1136, lng: 72.8697, verified: true, rating: 4.6,
      facilities: ['Parking', 'Cafe', 'Restroom', '24x7'],
      chargers: {
        create: [
          { code: 'CCS2-01', powerKw: 60, status: ChargerStatus.AVAILABLE, health: 94, connectors: { create: [{ type: ConnectorType.CCS2 }] }, pricing: { create: { pricePerKwh: 12 } } },
          { code: 'CCS2-02', powerKw: 60, status: ChargerStatus.OCCUPIED, health: 88, connectors: { create: [{ type: ConnectorType.CCS2 }] }, pricing: { create: { pricePerKwh: 12 } } },
          { code: 'TYPE2-01', powerKw: 22, status: ChargerStatus.FAULT, health: 22, connectors: { create: [{ type: ConnectorType.TYPE2 }] }, pricing: { create: { pricePerKwh: 12 } } },
        ],
      },
    },
    include: { chargers: true },
  });

  // Sample completed session with full payment lifecycle — matches spec §37
  const charger = andheri.chargers[0];
  const start = new Date('2026-09-30T18:20:00+05:30');
  const end = new Date('2026-09-30T18:52:00+05:30');
  const session = await prisma.chargingSession.create({
    data: {
      reference: 'CS_102938', userId: user.id, chargerId: charger.id, connector: ConnectorType.CCS2,
      startTime: start, endTime: end, energyKwh: 31.4, pricePerKwh: 12,
      estimatedAmount: 500, finalAmount: 376.8, startPct: 41, endPct: 79, status: 'COMPLETED',
    },
  });
  const payment = await prisma.payment.create({
    data: {
      reference: 'CO-2026-000471', userId: user.id, sessionId: session.id,
      provider: 'razorpay', method: 'UPI',
      amountAuthorized: 500, amountFinal: 376.8, amountReleased: 123.2, taxes: 57.48,
      state: PaymentState.SETTLED,
    },
  });
  const flow: [PaymentState | null, PaymentState, string][] = [
    [null, PaymentState.CREATED, 'Payment record created'],
    [PaymentState.CREATED, PaymentState.INITIATED, 'Payment initiated via UPI'],
    [PaymentState.INITIATED, PaymentState.AUTHORIZED, '₹500 authorized (not captured)'],
    [PaymentState.AUTHORIZED, PaymentState.CHARGER_CHECK, 'Charger handshake verified'],
    [PaymentState.CHARGER_CHECK, PaymentState.STARTED, 'Charging session started'],
    [PaymentState.STARTED, PaymentState.CHARGING, 'Energy delivery in progress'],
    [PaymentState.CHARGING, PaymentState.COMPLETED, 'Session complete — 31.4 kWh delivered'],
    [PaymentState.COMPLETED, PaymentState.SETTLED, '₹376.80 captured, ₹123.20 released'],
  ];
  for (const [from, to, note] of flow) {
    await prisma.transaction.create({ data: { paymentId: payment.id, fromState: from, toState: to, note } });
    await prisma.auditLog.create({ data: { entityType: 'PAYMENT', entityId: payment.reference, fromState: from ?? undefined, toState: to, note } });
  }
  await prisma.refund.create({
    data: {
      reference: 'CO-RF-10280', paymentId: payment.id, userId: user.id,
      amount: 123.2, reason: 'Unused authorized amount released after session',
      type: 'PARTIAL_RELEASE', status: 'COMPLETED',
      timeline: [
        { step: 'Session completed', done: true },
        { step: 'Final amount calculated', done: true },
        { step: 'Unused amount release requested', done: true },
        { step: 'Provider processing', done: true },
        { step: 'Bank settlement complete', done: true },
      ],
    },
  });

  console.log('✅ ChargeOne seed complete');
}

main().finally(() => prisma.$disconnect());
