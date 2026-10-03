// ChargeOne — Durable persistence layer.
// Primary: MongoDB Atlas Cloud Database.
// Fallback: SQLite (WAL mode) with ACID transactions.
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  connectMongo,
  isMongoConnected,
  seedMongoIfEmpty,
  hydrateFromMongo,
  saveToMongo,
  commitToMongo,
  mongoIdempotency,
  mongoLedgerStats,
  mongoLedgerTail,
} from './mongo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

let sqlite = null;
let upsert = null;
let appendLedger = null;
let idemGet = null;
let idemPut = null;

try {
  const { default: Database } = await import('better-sqlite3');
  sqlite = new Database(path.join(DATA_DIR, 'chargeone.db'));
  sqlite.pragma('journal_mode = WAL');
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
  upsert = sqlite.prepare('INSERT INTO entities (kind,id,json,updated_at) VALUES (?,?,?,datetime(\'now\')) ON CONFLICT(kind,id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at');
  appendLedger = sqlite.prepare('INSERT INTO ledger (kind,id,op,json) VALUES (?,?,?,?)');
  idemGet = sqlite.prepare('SELECT payment_id FROM idempotency WHERE key = ?');
  idemPut = sqlite.prepare('INSERT OR IGNORE INTO idempotency (key,payment_id) VALUES (?,?)');
} catch (err) {
  // SQLite optional native addon skipped; MongoDB Atlas will handle cloud persistence
}

// Full dictionary of persisted collections/entities
const KINDS = {
  users: 'id', payments: 'id', refunds: 'id', sessions: 'id', bookings: 'id',
  faultReports: 'id', notifications: 'id', walletTxns: 'id', incidents: 'id',
  auditLogs: 'id', vehicles: 'id', disputes: 'id',
  operators: 'id', stations: 'id', chargers: 'id', reviews: 'id', favorites: 'id',
};

// Cached stats for fast synchronous response
let cachedStats = {
  connected: false,
  engine: 'Initializing...',
  ledgerEntries: 0,
  persistedEntities: 0,
  cluster: null,
  database: null,
};
let cachedTail = [];

/**
 * Initialize persistence: connects to MongoDB Atlas, seeds if empty, hydrates store
 */
export async function initPersistence(db) {
  let cloudConnected = false;
  if (process.env.MONGODB_URI) {
    try {
      await connectMongo();
      cloudConnected = isMongoConnected();
      if (cloudConnected) {
        // Seed MongoDB if collections are empty
        await seedMongoIfEmpty(db);
        // Hydrate from MongoDB Atlas
        const restored = await hydrateFromMongo(db);
        console.log(`☁️ Persistence: Connected to MongoDB Atlas (${restored} entities hydrated)`);
        await refreshStats();
        return { engine: 'MongoDB Atlas', restored };
      }
    } catch (err) {
      console.warn(`⚠️ Cloud DB connection failed, falling back: ${err.message}`);
    }
  }

  // Fallback to SQLite hydration if available
  const restored = hydrateSqlite(db);
  console.log(`💾 Persistence: hydrated ${restored} entities from local storage`);
  await refreshStats();
  return { engine: 'Local/SQLite', restored };
}

/**
 * Save one entity durably to MongoDB Atlas & SQLite
 */
export function save(kind, entity, op = 'UPSERT') {
  if (!KINDS[kind] || !entity) return;

  // 1. Local SQLite write if available
  if (sqlite && upsert && appendLedger) {
    try {
      const j = JSON.stringify(entity);
      const tx = sqlite.transaction(() => {
        upsert.run(kind, entity.id, j);
        appendLedger.run(kind, entity.id, op, j);
      });
      tx();
    } catch (err) {
      console.error('SQLite save error:', err.message);
    }
  }

  // 2. MongoDB Atlas Cloud write (async background)
  if (isMongoConnected()) {
    saveToMongo(kind, entity, op).then(refreshStats).catch(err => {
      console.error('MongoDB Atlas save error:', err.message);
    });
  } else {
    refreshStatsSync();
  }
}

/**
 * Atomically commit a set of related entities
 */
export function commit(pairs) {
  // 1. Local SQLite commit if available
  if (sqlite && upsert && appendLedger) {
    try {
      const tx = sqlite.transaction(() => {
        for (const [kind, entity] of pairs) {
          if (!KINDS[kind] || !entity) continue;
          const j = JSON.stringify(entity);
          upsert.run(kind, entity.id, j);
          appendLedger.run(kind, entity.id, 'TXN', j);
        }
      });
      tx();
    } catch (err) {
      console.error('SQLite commit error:', err.message);
    }
  }

  // 2. MongoDB Atlas commit
  if (isMongoConnected()) {
    commitToMongo(pairs).then(refreshStats).catch(err => {
      console.error('MongoDB Atlas commit error:', err.message);
    });
  } else {
    refreshStatsSync();
  }
}

/**
 * Idempotency support for payment creation
 */
export const idempotency = {
  get: (key) => {
    if (idemGet) {
      const r = idemGet.get(key);
      if (r) return r.payment_id;
    }
    return null;
  },
  put: (key, paymentId) => {
    if (idemPut) {
      idemPut.run(key, paymentId);
    }
    if (isMongoConnected()) {
      mongoIdempotency.put(key, paymentId).catch(() => {});
    }
  },
};

/**
 * Hydrate the in-memory store from SQLite
 */
function hydrateSqlite(db) {
  if (!sqlite) return 0;
  try {
    const rows = sqlite.prepare('SELECT kind, id, json FROM entities').all();
    let restored = 0;
    for (const row of rows) {
      const arr = db[row.kind];
      if (!Array.isArray(arr)) continue;
      let obj;
      try { obj = JSON.parse(row.json); } catch { continue; }
      if (row.kind === 'sessions' && obj.live) {
        obj.live = false;
        obj.status = obj.status === 'CHARGING' ? 'INTERRUPTED' : obj.status;
      }
      const i = arr.findIndex(x => x.id === obj.id);
      if (i >= 0) arr[i] = { ...arr[i], ...obj };
      else arr.unshift(obj);
      restored++;
    }
    return restored;
  } catch {
    return 0;
  }
}

export function hydrate(db) {
  return hydrateSqlite(db);
}

/**
 * Asynchronously refresh cached statistics from cloud
 */
async function refreshStats() {
  if (isMongoConnected()) {
    try {
      const stats = await mongoLedgerStats();
      cachedStats = stats;
      cachedTail = await mongoLedgerTail(50);
      return;
    } catch {
      // fallback to sync refresh
    }
  }
  refreshStatsSync();
}

function refreshStatsSync() {
  if (sqlite) {
    try {
      const c = sqlite.prepare('SELECT COUNT(*) n FROM ledger').get();
      const e = sqlite.prepare('SELECT COUNT(*) n FROM entities').get();
      cachedStats = {
        connected: isMongoConnected(),
        ledgerEntries: c.n,
        persistedEntities: e.n,
        engine: isMongoConnected()
          ? `MongoDB Atlas (Cloud) · ${cachedStats.cluster || 'cluster0.qhb3z6g.mongodb.net'}`
          : 'SQLite ' + sqlite.pragma('journal_mode', { simple: true }).toUpperCase() + ' · ACID transactions',
      };
      cachedTail = sqlite.prepare('SELECT seq, at, kind, id, op FROM ledger ORDER BY seq DESC LIMIT 50').all();
      return;
    } catch {
      // ignore
    }
  }

  cachedStats = {
    connected: isMongoConnected(),
    ledgerEntries: 0,
    persistedEntities: 0,
    engine: isMongoConnected()
      ? 'MongoDB Atlas (Cloud) · cluster0.qhb3z6g.mongodb.net'
      : 'In-Memory / Cloud Store',
  };
  cachedTail = [];
}

export function ledgerStats() {
  return cachedStats;
}

export function ledgerTail(limit = 100) {
  if (cachedTail.length > 0) return cachedTail.slice(0, limit);
  if (sqlite) {
    try {
      return sqlite.prepare('SELECT seq, at, kind, id, op FROM ledger ORDER BY seq DESC LIMIT ?').all(limit);
    } catch {
      return [];
    }
  }
  return [];
}
