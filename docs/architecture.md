# ChargeOne — Architecture

> **"One platform. Every charge."** — an independent charging aggregation and
> software platform connecting EV users with **participating** charging networks.
> ChargeOne does not own chargers and does not claim every Indian station is integrated.

## 1. System overview

```
                        ┌──────────────────────────────────────────────┐
                        │                 CHARGEONE CLOUD              │
   Chargers / IoT       │                                              │      Clients
┌───────────────┐  MQTT │  ┌───────────┐   ┌────────────────────────┐  │  ┌─────────────┐
│ OCPP chargers ├──/────┼─▶│ Telemetry │──▶│  Core API (Express)    │  │  │  EV user app │
│ ESP32 retrofit│  HTTP │  │  ingest   │   │  - auth (JWT, RBAC)    │◀─┼──┤  Operator    │
└───────────────┘       │  └───────────┘   │  - stations/chargers   │  │  │  console     │
                        │                  │  - bookings/sessions   │  │  │  Admin       │
┌───────────────┐ OCPI  │  ┌───────────┐   │  - payment state mach. │  │  │  console     │
│ Network CPO   ├───────┼─▶│ Network   │──▶│  - refunds/disputes    │  │  └──────▲──────┘
│ back-offices  │       │  │ connectors│   │  - audit log           │  │         │
└───────────────┘       │  └───────────┘   └──────┬─────────┬───────┘  │  WebSocket (Socket.IO)
                        │                         │         │          │  live charger status,
                        │                  ┌──────▼───┐ ┌───▼───────┐  │  session telemetry,
                        │                  │ Postgres │ │ Socket.IO │──┼── payment/refund events
                        │                  │ (Prisma) │ │  fan-out  │  │
                        │                  └──────────┘ └───────────┘  │
                        │  ┌────────────────────────────────────────┐  │
                        │  │ Payment provider (Razorpay sandbox)    │  │
                        │  │ authorize → capture → refund webhooks  │  │
                        │  └────────────────────────────────────────┘  │
                        └──────────────────────────────────────────────┘
```

For the competition prototype the Core API runs an **in-memory store seeded
with realistic data** (`backend/data/seed.js`) plus a **simulation engine**
(`backend/services/engine.js`) so the complete user journey works without real
charger or bank integrations. The Prisma schema in `/prisma` is the production
database target.

## 2. The three flagship features

### 2.1 Charger Health / Verification
Every charger carries a transparent, informational reliability score (0–100):

| Factor                | Weight |
|-----------------------|--------|
| Successful sessions   | 40%    |
| Recent availability   | 20%    |
| Communication uptime  | 15%    |
| Fault frequency       | 15%    |
| User reports          | 10%    |

Before any payment, a **pre-check** re-verifies: station online, charger
available, connector free, recent successful session, network health, payment
handshake readiness. The score is informational, not a certification.

### 2.2 Protected & transparent payment flow (state machine)

```
CREATED → INITIATED → AUTHORIZED → CHARGER_CHECK → STARTED → CHARGING → COMPLETED → SETTLED
                                        │
                                        ▼ (handshake fails / session interrupted)
                                     FAILED → REFUND_PENDING → REFUND_PROCESSING → REFUNDED
```

* Amounts are **authorized first, captured only after energy delivery**
  wherever the payment provider supports auth/capture.
* Every transition is appended to the payment timeline **and** the global
  `audit_logs` table. Transactions are never deleted.
* ChargeOne never claims control over bank settlement timing — refund
  timelines show the exact pending step (provider processing / bank
  settlement) instead of promising instant refunds.

### 2.3 Centralized refund / issue tracking
* Refund Center shows every reversal (full reversal, partial release, manual
  review) with a step-by-step timeline.
* Fault reports flag chargers as **UNDER VERIFICATION** for other drivers and
  notify the operator + admin instantly.
* Disputes collect payment records, charger telemetry, session logs, fault
  reports and operator responses into one evidence file.

## 3. Real-time pipeline

```
ESP32 / charger → HTTP or MQTT → backend ingest → state update + audit
                                                → Socket.IO broadcast
                                                → user map / live session page
                                                → operator console
                                                → admin control center
```

Events: `charger:update`, `session:update`, `session:started`,
`payment:update`, `refund:update`, `notification:new`, `network:stats`.
The prototype ticks every 2 s and accelerates charging ~12× so a full demo
session finishes in minutes.

## 4. Security
* JWT auth (12 h expiry), role-based access control (USER / OPERATOR / ADMIN)
  enforced on every route.
* Password hashing (prototype: salted SHA-256; production: bcrypt/argon2).
* Per-IP rate limiting, input validation on all mutating endpoints.
* No card data is ever stored — only provider order/refund identifiers.
* Payment webhooks must be signature-verified (provider HMAC) in production.
* Sandbox payment credentials via environment variables (`.env`, never committed).
* IoT ingest in production sits behind MQTT-TLS with per-device credentials.

## 5. Demo mode
Admin → **Demo Mode** triggers seven scripted scenarios (normal charge,
unavailability, successful start, handshake failure with protected payment,
unexpected interruption, refund progressing, refund completed) against a
dedicated demo charger (Mumbai Airport T2 · CCS2-01), letting judges see every
role's screen react live without real hardware.
