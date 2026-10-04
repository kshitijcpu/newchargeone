// ChargeOne — MongoDB Atlas Cloud Persistence Layer
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'chargeone';

let client = null;
let db = null;
let isConnected = false;
let lastError = null;

// All ChargeOne entity collections
export const ENTITY_COLLECTIONS = [
  'operators',
  'stations',
  'chargers',
  'users',
  'vehicles',
  'sessions',
  'payments',
  'refunds',
  'notifications',
  'walletTxns',
  'faultReports',
  'disputes',
  'bookings',
  'favorites',
  'reviews',
  'auditLogs',
  'incidents',
];

/**
 * Connect to MongoDB Atlas and initialize indexes
 */
export async function connectMongo() {
  if (isConnected && db) return db;
  if (!MONGODB_URI) {
    lastError = 'MongoDB URI not configured in environment (MONGODB_URI)';
    console.error('❌ Failed to connect to MongoDB: MONGODB_URI is not configured in environment');
    return null;
  }

  try {
    console.log(`🔌 Connecting to MongoDB Atlas (${MONGODB_URI.replace(/:[^:]*@/, ':****@')})...`);
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority',
    });

    await client.connect();
    db = client.db(MONGODB_DB_NAME);
    await db.command({ ping: 1 });
    isConnected = true;
    lastError = null;
    console.log(`✅ Connected to MongoDB Atlas! Database: "${MONGODB_DB_NAME}"`);

    await initIndexes();
    return db;
  } catch (err) {
    isConnected = false;
    db = null;
    lastError = err.message;
    console.error('❌ Failed to connect to MongoDB:', err.message);
    throw err;
  }
}

export function isMongoConnected() {
  return isConnected && !!db;
}

export function getMongoDb() {
  return db;
}

export function getMongoError() {
  return lastError;
}

/**
 * Ensure performance and uniqueness indexes on all collections
 */
async function initIndexes() {
  if (!db) return;
  try {
    // Unique ID indexes for all entity collections
    for (const col of ENTITY_COLLECTIONS) {
      await db.collection(col).createIndex({ id: 1 }, { unique: true, sparse: true });
    }

    // Additional specific indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
    await db.collection('sessions').createIndex({ userId: 1, status: 1 });
    await db.collection('payments').createIndex({ userId: 1, status: 1 });
    await db.collection('chargers').createIndex({ stationId: 1, status: 1 });
    await db.collection('stations').createIndex({ city: 1 });
    await db.collection('bookings').createIndex({ userId: 1, date: 1 });
    await db.collection('incidents').createIndex({ operatorId: 1, status: 1 });
    await db.collection('favorites').createIndex({ userId: 1, stationId: 1 }, { unique: true, sparse: true });

    // Ledger index (descending sequence for fast tail)
    await db.collection('ledger').createIndex({ seq: -1 });

    // Idempotency index with 24-hour TTL expiration
    await db.collection('idempotency').createIndex({ key: 1 }, { unique: true });
    await db.collection('idempotency').createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });
  } catch (err) {
    console.warn('⚠️ Warning setting up MongoDB indexes:', err.message);
  }
}

/**
 * Seed MongoDB Atlas if collections are empty
 */
export async function seedMongoIfEmpty(seedData) {
  if (!db) return;

  let totalSeeded = 0;
  for (const col of ENTITY_COLLECTIONS) {
    const count = await db.collection(col).countDocuments();
    if (count === 0 && Array.isArray(seedData[col]) && seedData[col].length > 0) {
      // Clone docs without explicit _id so MongoDB creates clean ObjectIds
      const docs = seedData[col].map(item => {
        const copy = { ...item };
        delete copy._id;
        return copy;
      });
      await db.collection(col).insertMany(docs);
      totalSeeded += docs.length;
      console.log(`🌱 [MongoDB Atlas] Seeded ${docs.length} documents into "${col}"`);
    }
  }

  // Seed initial ledger entries if empty
  const ledgerCount = await db.collection('ledger').countDocuments();
  if (ledgerCount === 0) {
    const initialEntry = {
      seq: 1,
      at: new Date().toISOString(),
      kind: 'system',
      id: 'INIT',
      op: 'SEED_INIT',
      note: 'Initial MongoDB Atlas cloud database seed completed',
    };
    await db.collection('ledger').insertOne(initialEntry);
  }

  return totalSeeded;
}

/**
 * Hydrate the in-memory store directly from MongoDB Atlas at boot.
 * Persistent cloud records overwrite/merge seed definitions.
 */
export async function hydrateFromMongo(inMemoryDb) {
  if (!db) return 0;

  let totalHydrated = 0;
  for (const col of ENTITY_COLLECTIONS) {
    const cloudDocs = await db.collection(col).find({}, { projection: { _id: 0 } }).toArray();
    if (!cloudDocs || cloudDocs.length === 0) continue;

    const memArr = inMemoryDb[col];
    if (!Array.isArray(memArr)) {
      inMemoryDb[col] = cloudDocs;
      totalHydrated += cloudDocs.length;
      continue;
    }

    // Merge or replace cloud documents
    for (const doc of cloudDocs) {
      // Never resurrect a live charging session across restarts
      if (col === 'sessions' && doc.live) {
        doc.live = false;
        if (doc.status === 'CHARGING') doc.status = 'INTERRUPTED';
      }

      const idx = memArr.findIndex(x => x.id === doc.id);
      if (idx >= 0) {
        memArr[idx] = { ...memArr[idx], ...doc };
      } else {
        memArr.unshift(doc);
      }
      totalHydrated++;
    }
  }

  return totalHydrated;
}

/**
 * Save an entity to MongoDB Atlas (upsert) and append to the cloud ledger
 */
export async function saveToMongo(kind, entity, op = 'UPSERT') {
  if (!db || !entity || !entity.id) return;

  const doc = { ...entity };
  delete doc._id;
  doc.updatedAt = new Date().toISOString();

  try {
    await db.collection(kind).updateOne(
      { id: entity.id },
      { $set: doc },
      { upsert: true }
    );

    const seq = (await db.collection('ledger').countDocuments()) + 1;
    await db.collection('ledger').insertOne({
      seq,
      at: new Date().toISOString(),
      kind,
      id: entity.id,
      op,
      json: JSON.stringify(doc),
    });
  } catch (err) {
    console.error(`❌ [MongoDB] Error saving ${kind} (${entity.id}):`, err.message);
  }
}

/**
 * Commit multiple related entities in batch to MongoDB Atlas and record in ledger
 */
export async function commitToMongo(pairs) {
  if (!db || !Array.isArray(pairs)) return;

  try {
    for (const [kind, entity] of pairs) {
      if (!kind || !entity || !entity.id) continue;
      const doc = { ...entity };
      delete doc._id;
      doc.updatedAt = new Date().toISOString();

      await db.collection(kind).updateOne(
        { id: entity.id },
        { $set: doc },
        { upsert: true }
      );

      const seq = (await db.collection('ledger').countDocuments()) + 1;
      await db.collection('ledger').insertOne({
        seq,
        at: new Date().toISOString(),
        kind,
        id: entity.id,
        op: 'TXN',
        json: JSON.stringify(doc),
      });
    }
  } catch (err) {
    console.error('❌ [MongoDB] Error committing batch transaction:', err.message);
  }
}

/**
 * Idempotency support backed by MongoDB Atlas
 */
export const mongoIdempotency = {
  get: async (key) => {
    if (!db || !key) return null;
    try {
      const record = await db.collection('idempotency').findOne({ key });
      return record ? record.paymentId : null;
    } catch {
      return null;
    }
  },
  put: async (key, paymentId) => {
    if (!db || !key) return;
    try {
      await db.collection('idempotency').updateOne(
        { key },
        { $set: { key, paymentId, createdAt: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      console.warn('⚠️ [MongoDB] Idempotency record error:', err.message);
    }
  },
};

/**
 * Cloud persistence statistics
 */
export async function mongoLedgerStats() {
  if (!db || !isConnected) {
    return {
      connected: false,
      engine: lastError ? `MongoDB Atlas (Disconnected — ${lastError})` : 'MongoDB Atlas (Disconnected)',
      ledgerEntries: 0,
      persistedEntities: 0,
      collections: {},
    };
  }

  try {
    const ledgerEntries = await db.collection('ledger').countDocuments();
    let persistedEntities = 0;
    const collections = {};

    for (const col of ENTITY_COLLECTIONS) {
      const c = await db.collection(col).countDocuments();
      collections[col] = c;
      persistedEntities += c;
    }

    return {
      connected: isConnected,
      engine: `MongoDB Atlas (Cloud) · cluster0.qhb3z6g.mongodb.net (${MONGODB_DB_NAME})`,
      cluster: 'cluster0.qhb3z6g.mongodb.net',
      database: MONGODB_DB_NAME,
      ledgerEntries,
      persistedEntities,
      collections,
    };
  } catch (err) {
    return {
      connected: false,
      engine: 'MongoDB Atlas (Error: ' + err.message + ')',
      ledgerEntries: 0,
      persistedEntities: 0,
      collections: {},
    };
  }
}

/**
 * Retrieve recent ledger write records from MongoDB Atlas
 */
export async function mongoLedgerTail(limit = 100) {
  if (!db) return [];
  try {
    const rows = await db.collection('ledger')
      .find({}, { projection: { _id: 0, seq: 1, at: 1, kind: 1, id: 1, op: 1 } })
      .sort({ seq: -1 })
      .limit(limit)
      .toArray();
    return rows;
  } catch (err) {
    console.error('❌ [MongoDB] Error fetching ledger tail:', err.message);
    return [];
  }
}

/**
 * Disconnect client (for clean shutdown or script exits)
 */
export async function closeMongo() {
  if (client) {
    await client.close();
    isConnected = false;
    db = null;
    client = null;
  }
}
