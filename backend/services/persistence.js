// ChargeOne — durable persistence layer.
// SQLite (WAL mode) with ACID transactions + an append-only ledger table.
// Critical financial mutations (payment + refund + wallet) are committed
// atomically; the in-memory store is a read cache hydrated at boot.
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new Database(path.join(DATA_DIR, 'chargeone.db'));
sqlite.pragma('journal_mode = WAL');       // crash-safe write-ahead log
sqlite.pragma('synchronous = NORMAL');
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS entities (
    kind TEXT NOT NULL,
    id   TEXT NOT NULL,
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (kind, id)
  );
  CREATE TABLE IF NOT EXISTS ledger (
    seq  INTEGER PRIMARY KEY AUTOINCREMENT,
    at   TEXT NOT NULL DEFAULT (datetime('now')),
    kind TEXT NOT NULL,
    id   TEXT NOT NULL,
    op   TEXT NOT NULL,
    json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS idempotency (
    key        TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL,
    at         TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const upsert = sqlite.prepare('INSERT INTO entities (kind,id,json,updated_at) VALUES (?,?,?,datetime(\'now\')) ON CONFLICT(kind,id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at');
const appendLedger = sqlite.prepare('INSERT INTO ledger (kind,id,op,json) VALUES (?,?,?,?)');
const idemGet = sqlite.prepare('SELECT payment_id FROM idempotency WHERE key = ?');
const idemPut = sqlite.prepare('INSERT OR IGNORE INTO idempotency (key,payment_id) VALUES (?,?)');

// PERSISTED_KINDS map: store array name -> id field
const KINDS = {
  users: 'id', payments: 'id', refunds: 'id', sessions: 'id', bookings: 'id',
  faultReports: 'id', notifications: 'id', walletTxns: 'id', incidents: 'id',
  auditLogs: 'id', vehicles: 'id', disputes: 'id',
};

/** Save one entity durably (upsert + ledger append) inside a transaction. */
export function save(kind, entity, op = 'UPSERT') {
  if (!KINDS[kind] || !entity) return;
  const j = JSON.stringify(entity);
  const tx = sqlite.transaction(() => {
    upsert.run(kind, entity.id, j);
    appendLedger.run(kind, entity.id, op, j);
  });
  tx();
}

/** Atomically commit a set of related entities (e.g. payment + refund + user wallet). */
export function commit(pairs) {
  const tx = sqlite.transaction(() => {
    for (const [kind, entity] of pairs) {
      if (!KINDS[kind] || !entity) continue;
      const j = JSON.stringify(entity);
      upsert.run(kind, entity.id, j);
      appendLedger.run(kind, entity.id, 'TXN', j);
    }
  });
  tx();
}

/** Idempotency support for payment creation. */
export const idempotency = {
  get: (key) => { const r = idemGet.get(key); return r ? r.payment_id : null; },
  put: (key, paymentId) => idemPut.run(key, paymentId),
};

/** Hydrate the in-memory store from SQLite at boot (persisted rows win over seed). */
export function hydrate(db) {
  const rows = sqlite.prepare('SELECT kind, id, json FROM entities').all();
  let restored = 0;
  for (const row of rows) {
    const arr = db[row.kind];
    if (!Array.isArray(arr)) continue;
    let obj;
    try { obj = JSON.parse(row.json); } catch { continue; }
    // never resurrect a live session across restarts — mark interrupted
    if (row.kind === 'sessions' && obj.live) { obj.live = false; obj.status = obj.status === 'CHARGING' ? 'INTERRUPTED' : obj.status; }
    const i = arr.findIndex(x => x.id === obj.id);
    if (i >= 0) arr[i] = { ...arr[i], ...obj };
    else arr.unshift(obj);
    restored++;
  }
  return restored;
}

export function ledgerStats() {
  const c = sqlite.prepare('SELECT COUNT(*) n FROM ledger').get();
  const e = sqlite.prepare('SELECT COUNT(*) n FROM entities').get();
  return { ledgerEntries: c.n, persistedEntities: e.n, engine: 'SQLite ' + sqlite.pragma('journal_mode', { simple: true }).toUpperCase() + ' · ACID transactions' };
}

export function ledgerTail(limit = 100) {
  return sqlite.prepare('SELECT seq, at, kind, id, op FROM ledger ORDER BY seq DESC LIMIT ?').all(limit);
}
