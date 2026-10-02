# ChargeOne — REST API

Base URL: `/api` · JSON everywhere · Auth: `Authorization: Bearer <JWT>`

Demo accounts (password `demo123`): `kshitij@demo.in` (USER),
`operator@demo.in` (OPERATOR), `admin@demo.in` (ADMIN).

## Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{name,email,password,phone}` | returns `{token,user}` |
| POST | `/auth/login` | `{email,password}` | returns `{token,user}` |
| POST | `/auth/logout` | – | stateless (client drops token) |
| GET  | `/auth/me` | – | current user |

## Stations & chargers
| Method | Path | Notes |
|---|---|---|
| GET | `/stations` | filters: `q, city, connector, status, minPower, maxPrice, minHealth, facility` |
| GET | `/stations/nearby?lat&lng&limit` | distance-sorted |
| GET | `/stations/:id` | station + chargers + reviews |
| GET | `/chargers/:id` | charger + parent station |
| GET | `/chargers/:id/status` | live status/telemetry |
| GET | `/chargers/:id/precheck` | 6-point verification + health factors |

## Vehicles
`GET/POST /vehicles`, `PATCH/DELETE /vehicles/:id` (auth USER)

## Bookings
| POST | `/bookings` | `{stationId,chargerId,date,startTime,durationMin}` → `CO-BKG-xxxxx` |
| GET | `/bookings`, `/bookings/:id` | |
| DELETE | `/bookings/:id` | cancels (kept in history) |

## Payments & charging sessions
| Method | Path | Notes |
|---|---|---|
| POST | `/payments/create` | `{chargerId,amount,method}` → payment walks CREATED→INITIATED→AUTHORIZED |
| POST | `/sessions/start` | `{paymentId,chargerId,vehicleId}` → CHARGER_CHECK; on success STARTED→CHARGING + live session; on failure FAILED→REFUND_PENDING + auto refund |
| GET | `/sessions/active` | current live session for user |
| GET | `/sessions/:id` | session + linked payment |
| POST | `/sessions/:id/stop` | settle: COMPLETED→SETTLED, unused amount released |
| GET | `/history` | all user sessions |
| GET | `/payments`, `/payments/:id` | full timeline, linked refunds, audit entries |

## Refunds
| GET | `/refunds`, `/refunds/:id` | timeline with done/pending steps |
| POST | `/refunds` | `{paymentId,reason}` manual review request |

## Wallet / favorites / notifications
`GET /wallet`, `POST /wallet/add` (simulated) ·
`GET /favorites`, `POST /favorites/:stationId` (toggle) ·
`GET /notifications`, `POST /notifications/read`

## Fault reports
| POST | `/reports` | `{stationId,chargerId,issue,description,photo}` → `CO-xxxxx`, charger flagged UNDER VERIFICATION, operator+admin notified |
| GET | `/reports`, `/reports/:id` | |

## Route planner
`POST /route-plan` `{from,to,batteryPct,connector,rangeFullKm}` →
distance, stops (station, leg km, charge min, est cost), totals, coordinates.

## Operator (role OPERATOR)
`GET /operator/overview | stations | chargers | sessions | faults` ·
`POST /operator/chargers/:id` `{status?|pricePerKwh?}` (maintenance / tariff)

## Admin (role ADMIN)
`GET /admin/overview | users | users/:id | operators | payments?status= | refunds | disputes | reports | audit` ·
`POST /admin/users/:id/toggle`, `/admin/operators/:id/toggle`,
`/admin/refunds/:id/advance` ·
**Demo:** `POST /demo/scenario/:n` (n = 1..7)

## IoT ingest
`POST /iot/telemetry` — ESP32 frame:
```json
{ "charger_id": "CH_30", "station_id": "ST_202", "status": "CHARGING",
  "voltage": 392, "current": 48, "power_kw": 18.8, "energy_kwh": 21.4,
  "connector": "CCS2", "temperature": 34.2, "fault": null }
```
`POST /iot/:chargerId/status` `{status,fault}` — quick manual override.
(Production: MQTT-TLS + per-device auth; HTTP endpoint kept for demo.)

## WebSocket events (Socket.IO, path `/socket.io`)
`network:stats`, `charger:update`, `session:started`, `session:update`,
`payment:update`, `refund:update`, `notification:new`.
