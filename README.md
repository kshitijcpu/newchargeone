# ⚡ ChargeOne — *One platform. Every charge.*

An independent EV charging **aggregation and payment-management platform** for
India: find, verify and pay for charging across participating networks — with
transparent charging sessions, a protected payment flow and centralized
refund/issue tracking.

> Competition prototype: charging networks, payments and IoT telemetry are
> realistically **simulated** end-to-end. The architecture is designed for
> later OCPI/OCPP network integrations and a sandbox/production payment
> provider (auth → capture → refund).

## The three flagship features
1. **Charger Health / Verification** — transparent 0–100 reliability score
   (successful sessions 40%, availability 20%, comm uptime 15%, fault
   frequency 15%, user reports 10%) + a 6-point pre-check before any payment.
2. **Protected & transparent payment flow** — full state machine
   (`CREATED → … → SETTLED`, failure path `FAILED → REFUND_PENDING → … → REFUNDED`),
   authorization-first, every transition audit-logged, nothing ever deleted.
3. **Centralized refund / issue tracking** — Refund Center with step-by-step
   provider/bank timelines, fault reporting that flags chargers for other
   drivers, and admin dispute files with evidence.

## Quick start
```bash
# backend (Express + Socket.IO, port 4000)
cd backend && npm install && npm start

# frontend (Vite + React, port 3000, proxies /api and /socket.io)
cd frontend && npm install && npm run dev
```
Open http://localhost:3000

**Demo logins** (password `demo123`):
| Role | Email |
|---|---|
| EV user | `kshitij@demo.in` |
| Operator (Tata Power EZ Charge) | `operator@demo.in` |
| ChargeOne admin | `admin@demo.in` |

## Competition demo script (5 minutes)
1. **Landing page** — problem, live map, health & protected-payment story.
2. Log in as **user** → Dashboard → *Find Charger* → open **Mumbai Airport T2**.
3. **Charge Now** on `CCS2-01` → watch the pre-check, authorize ₹500 →
   handshake OK → **live charging screen** (WebSocket telemetry).
4. In a second tab, log in as **admin** → live session visible on the control
   center; **operator** sees it too.
5. Admin → **Demo Mode** → *Scenario 5* (unexpected interruption): the user's
   session stops, partial energy billed, unused authorization queued.
6. Or run *Scenario 4*: payment authorized but **handshake fails** → user sees
   `CHARGING NOT STARTED · payment PROTECTED · refund INITIATED` → **Refund
   Center** timeline → admin advances / completes the refund (*Scenarios 6–7*),
   wallet credited, notification fires.
7. Optional hardware moment: `node iot/esp32_charger_simulator/simulator.js`
   (or a real ESP32 with the included firmware) — press keys/button to flip the
   charger between AVAILABLE/CHARGING/FAULT and watch every screen update live.

## Project structure
```
frontend/           React 18 + Vite + Tailwind + Leaflet + Recharts + Socket.IO client
  src/components    design system, map, layouts (user/operator/admin shells)
  src/pages         public site · user app · operator portal · admin console
backend/            Express + Socket.IO
  data/seed.js      29 stations · 7 cities · 6 operators · realistic history
  services/engine.js  payment state machine, live session ticker, demo scenarios, IoT ingest
  server.js         REST API, JWT auth + RBAC, rate limiting, audit logs
prisma/             production PostgreSQL schema (18 tables) + seed.ts
iot/                ESP32 firmware (.ino) + Node charger-node simulator
docs/               architecture · api · database
```

## Honest positioning (by design)
- ChargeOne is an *independent aggregation platform* — it does **not** own
  stations and does **not** claim every Indian charger is integrated
  ("participating networks", "supported stations").
- Health scores are informational indicators, **not certifications**.
- Refund timing depends on the payment provider and bank; ChargeOne shows the
  exact pending step rather than promising instant bank credit.
- The prototype wallet is simulated; production stored-value would use a
  licensed provider mechanism.

## Production-grade layer (v2)
The prototype now includes real implementations of the production concerns:

| Concern | Implementation |
|---|---|
| **OCPP 1.6J** | Real OCPP-J central system at `ws://host:4000/ocpp/<id>` (BootNotification, StatusNotification, Heartbeat, MeterValues, Start/StopTransaction, RemoteStart). Demo charge point: `node backend/tools/ocpp_demo_charger.js CH_30` — watch **Admin → Integrations** live. |
| **OCPI 2.2** | Token-authenticated eMSP endpoints at `/ocpi/2.2` (versions, locations, tariffs) with real OCPI Location/EVSE/Connector objects + peer CPO sync registry. |
| **Payments** | Razorpay provider module: real sandbox orders/refunds when env keys are set, deterministic fallback otherwise. HMAC-SHA256 webhook verification (constant-time), `Idempotency-Key` replay protection. |
| **Persistence** | SQLite (WAL) with ACID transactions — payment + refund + wallet commit atomically; append-only ledger table; full state survives restarts; live sessions are safely marked interrupted on crash recovery. Production target remains PostgreSQL + Prisma. |
| **Incident management** | Operator → Incidents: P1/P2/P3 severity, SLA countdowns/breaches, auto-creation from telemetry faults & user reports, acknowledge → investigate → maintenance → resolve workflow with action timelines. |
| **Forecasting** | Per-station 8-hour availability forecast ("best time to charge") on station pages; predicted availability at ETA per route-planner stop; network demand model endpoint. |
| **Compliance & audit** | Admin → Audit Ledger: filterable immutable trail (payments, chargers, OCPP, OCPI, webhooks, incidents), CSV export; dispute actions (request operator response / resolve) with user notification. |
