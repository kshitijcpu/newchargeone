# ChargeOne — Database design (PostgreSQL + Prisma)

Schema: [`/prisma/schema.prisma`](../prisma/schema.prisma) · Seed: [`/prisma/seed.ts`](../prisma/seed.ts)

## Entity relationships

```
OPERATOR 1─* STATION 1─* CHARGER 1─* CONNECTOR
                              │ 1─* CHARGER_STATUS (telemetry log)
                              │ 1─1 PRICING
USER 1─* VEHICLE
USER 1─* BOOKING *─1 CHARGER
USER 1─* CHARGING_SESSION *─1 CHARGER
USER 1─* PAYMENT 1─1 CHARGING_SESSION
PAYMENT 1─* TRANSACTION            (every state transition)
PAYMENT 1─* REFUND
USER 1─* FAULT_REPORT *─1 STATION
USER 1─* SUPPORT_TICKET / NOTIFICATION / REVIEW / FAVORITE
AUDIT_LOG — global append-only trail for every entity transition
```

## Tables (18)
`users, vehicles, operators, stations, chargers, connectors, charger_status,
bookings, charging_sessions, payments, refunds, transactions, fault_reports,
support_tickets, notifications, reviews, pricing, audit_logs`

## Key design decisions

1. **Money is a state machine, not a row update.** `payments.state` is only
   ever changed together with an appended `transactions` row (from → to +
   note + timestamp). Failed payments are never deleted — they transition to
   `FAILED → REFUND_PENDING → …` and stay queryable forever.
2. **Refund timelines are first-class.** `refunds.timeline` (JSONB) stores
   ordered workflow steps (`step`, `done`, `at`) so the UI can always answer
   *"which step is pending?"* instead of showing a bare status.
3. **Telemetry is append-only.** `charger_status` keeps every frame with a
   `source` (`telemetry | ESP32 | operator | system`); the charger row caches
   the latest status + computed `health` for fast reads.
4. **Health score is derived**, recomputed from `charger_status`,
   `charging_sessions` and `fault_reports` (weights 40/20/15/15/10) — stored
   denormalized on `chargers.health` for map queries.
5. **No sensitive payment data.** Only provider identifiers
   (`providerOrderId`, `providerRefundId`) are stored. Card/UPI credentials
   never touch ChargeOne.
6. **Geo queries** use a `(lat, lng)` index; production would add PostGIS for
   radius/route corridor searches.

## Sample object (charging session)
```json
{
  "session_id": "CS_102938",
  "user_id": "USR_1842",
  "station_id": "ST_204",
  "charger_id": "CH_17",
  "connector": "CCS2",
  "start_time": "2026-09-30T18:20:00",
  "end_time": "2026-09-30T18:52:00",
  "energy_kwh": 31.4,
  "price_per_kwh": 12,
  "estimated_amount": 500,
  "final_amount": 376.8,
  "status": "COMPLETED"
}
```

## Cloud Database Support (MongoDB Atlas)
ChargeOne now features real-time **MongoDB Atlas Cloud Database** support. All 17 entity collections (`operators`, `stations`, `chargers`, `users`, `vehicles`, `sessions`, `payments`, `refunds`, `notifications`, `walletTxns`, `faultReports`, `disputes`, `bookings`, `favorites`, `reviews`, `auditLogs`, `incidents`), as well as an append-only `ledger` and `idempotency` collection, are stored and synchronized directly in the cloud.

### Connection & Commands
```bash
# Verify MongoDB Atlas connectivity
npm run db:verify

# Seed or reset MongoDB Atlas collections
npm run db:seed
npm run db:seed -- --reset
```
When `MONGODB_URI` is configured in `.env`, the platform automatically connects to MongoDB Atlas at boot, seeds any empty collections, and hydrates active application state from the cloud database. If disconnected, it safely falls back to local SQLite.
