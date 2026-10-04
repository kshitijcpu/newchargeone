// ChargeOne — Pure MongoDB Atlas Cloud Persistence Layer
// No local/on-prem database backup — strictly MongoDB
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
  getMongoError,
} from './mongo.js';

// Full dictionary of persisted collections/entities
const KINDS = {
  users: 'id', payments: 'id', refunds: 'id', sessions: 'id', bookings: 'id',
  faultReports: 'id', notifications: 'id', walletTxns: 'id', incidents: 'id',
  auditLogs: 'id', vehicles: 'id', disputes: 'id',
  operators: 'id', stations: 'id', chargers: 'id', reviews: 'id', favorites: 'id',
};

// In-memory idempotency cache for fast retrieval and offline buffering
const memIdempotency = new Map();

// Cached stats for fast synchronous response
let cachedStats = {
  connected: false,
  engine: 'MongoDB Atlas (Connecting...)',
  ledgerEntries: 0,
  persistedEntities: 0,
  cluster: null,
  database: null,
};
let cachedTail = [];
let reconnectTimer = null;

/**
 * Initialize persistence: connects exclusively to MongoDB Atlas, seeds if empty, hydrates store.
 * If connection fails, logs a console error as required.
 */
export async function initPersistence(db) {
  try {
    await connectMongo();
    if (isMongoConnected()) {
      // Seed MongoDB if collections are empty
      await seedMongoIfEmpty(db);
      // Hydrate in-memory store from MongoDB Atlas
      const restored = await hydrateFromMongo(db);
      console.log(`☁️ Persistence: Connected to MongoDB Atlas (${restored} entities hydrated)`);
      await refreshStats();
      return { engine: 'MongoDB Atlas', restored };
    }
  } catch (err) {
    // Explicitly log the console error
    console.error('❌ [MongoDB Persistence] Failed to connect to MongoDB:', err.message);
  }

  // Pure MongoDB mode — no on-prem backup DB fallback
  refreshStatsSync();

  // Set up background reconnection attempts if not connected
  if (!reconnectTimer && !isMongoConnected()) {
    reconnectTimer = setInterval(async () => {
      if (isMongoConnected()) {
        clearInterval(reconnectTimer);
        reconnectTimer = null;
        return;
      }
      try {
        await connectMongo();
        if (isMongoConnected()) {
          console.log('✅ [MongoDB Persistence] Successfully reconnected to MongoDB Atlas!');
          await seedMongoIfEmpty(db);
          await hydrateFromMongo(db);
          await refreshStats();
          clearInterval(reconnectTimer);
          reconnectTimer = null;
        }
      } catch (err) {
        console.error('❌ [MongoDB Persistence] Reconnection attempt failed:', err.message);
      }
    }, 30000);
    if (reconnectTimer.unref) reconnectTimer.unref();
  }

  return { engine: 'MongoDB Atlas (Disconnected)', restored: 0 };
}

/**
 * Save one entity durably to MongoDB Atlas
 */
export function save(kind, entity, op = 'UPSERT') {
  if (!KINDS[kind] || !entity) return;

  if (isMongoConnected()) {
    saveToMongo(kind, entity, op)
      .then(refreshStats)
      .catch(err => {
        console.error(`❌ [MongoDB] Save error for ${kind} (${entity.id}):`, err.message);
      });
  } else {
    refreshStatsSync();
  }
}

/**
 * Atomically commit a set of related entities to MongoDB Atlas
 */
export function commit(pairs) {
  if (isMongoConnected()) {
    commitToMongo(pairs)
      .then(refreshStats)
      .catch(err => {
        console.error('❌ [MongoDB] Batch commit error:', err.message);
      });
  } else {
    refreshStatsSync();
  }
}

/**
 * Idempotency support backed by MongoDB Atlas
 */
export const idempotency = {
  get: (key) => {
    return memIdempotency.get(key) || null;
  },
  put: (key, paymentId) => {
    memIdempotency.set(key, paymentId);
    if (isMongoConnected()) {
      mongoIdempotency.put(key, paymentId).catch(err => {
        console.error('❌ [MongoDB] Idempotency record error:', err.message);
      });
    }
  },
};

/**
 * Hydrate the in-memory store from MongoDB
 */
export function hydrate(db) {
  if (isMongoConnected()) {
    return hydrateFromMongo(db);
  }
  return 0;
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
  const err = getMongoError();
  cachedStats = {
    connected: isMongoConnected(),
    ledgerEntries: 0,
    persistedEntities: 0,
    cluster: 'cluster0.qhb3z6g.mongodb.net',
    database: process.env.MONGODB_DB_NAME || 'chargeone',
    engine: isMongoConnected()
      ? `MongoDB Atlas (Cloud) · cluster0.qhb3z6g.mongodb.net (${process.env.MONGODB_DB_NAME || 'chargeone'})`
      : (err ? `MongoDB Atlas (Disconnected — ${err})` : 'MongoDB Atlas (Disconnected)'),
  };
  cachedTail = [];
}

export function ledgerStats() {
  return cachedStats;
}

export function ledgerTail(limit = 100) {
  if (cachedTail.length > 0) return cachedTail.slice(0, limit);
  return [];
}
