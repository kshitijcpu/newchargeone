// ChargeOne — MongoDB Atlas Seeder Script
import 'dotenv/config';
import crypto from 'crypto';
import { MongoClient } from 'mongodb';
import { buildSeed } from '../data/seed.js';
import { ENTITY_COLLECTIONS } from '../services/mongo.js';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'chargeone';

console.log('='.repeat(65));
console.log('⚡ ChargeOne MongoDB Atlas Cloud Seeder');
console.log('='.repeat(65));

if (!uri) {
  console.error('❌ MONGODB_URI is not set in environment or .env');
  process.exit(1);
}

const shouldReset = process.argv.includes('--reset');

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 15000,
});

try {
  await client.connect();
  const db = client.db(dbName);
  console.log(`Connected to MongoDB Atlas database "${dbName}"`);

  const seed = buildSeed();

  // Hash passwords for users in seed data
  const hash = (pw) => crypto.createHash('sha256').update('co-salt::' + pw).digest('hex');
  if (Array.isArray(seed.users)) {
    seed.users.forEach(u => {
      if (u.password) {
        u.passwordHash = hash(u.password);
        delete u.password;
      }
    });
  }

  let totalInserted = 0;

  for (const colName of ENTITY_COLLECTIONS) {
    const col = db.collection(colName);
    const existingCount = await col.countDocuments();

    if (existingCount > 0 && !shouldReset) {
      console.log(`ℹ️ [${colName}] already contains ${existingCount} documents (skipping, use --reset to overwrite)`);
      continue;
    }

    if (shouldReset && existingCount > 0) {
      await col.deleteMany({});
      console.log(`🗑️ [${colName}] cleared existing ${existingCount} documents.`);
    }

    const items = seed[colName];
    if (Array.isArray(items) && items.length > 0) {
      const docs = items.map(x => {
        const copy = { ...x };
        delete copy._id;
        return copy;
      });
      await col.insertMany(docs);
      totalInserted += docs.length;
      console.log(`✅ [${colName.padEnd(15)}] Seeded ${docs.length.toString().padStart(3)} documents`);
    } else {
      console.log(`⚠️ [${colName.padEnd(15)}] No items to seed in seed definition`);
    }
  }

  // Seed initial ledger if empty or resetting
  const ledgerCol = db.collection('ledger');
  const existingLedger = await ledgerCol.countDocuments();
  if (existingLedger === 0 || shouldReset) {
    if (shouldReset && existingLedger > 0) await ledgerCol.deleteMany({});
    await ledgerCol.insertOne({
      seq: 1,
      at: new Date().toISOString(),
      kind: 'system',
      id: 'INIT',
      op: 'SEED_INIT',
      json: JSON.stringify({ seededAt: new Date().toISOString(), collections: ENTITY_COLLECTIONS.length, totalInserted }),
    });
    console.log(`✅ [ledger         ] Seeded initial ledger checkpoint`);
  }

  console.log('\n' + '='.repeat(65));
  console.log(`🎉 Cloud Seeding Complete! Total inserted: ${totalInserted} documents across ${ENTITY_COLLECTIONS.length} collections.`);
  console.log('='.repeat(65));
} catch (err) {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
} finally {
  await client.close();
}
