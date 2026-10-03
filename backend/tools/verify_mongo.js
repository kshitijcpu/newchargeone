// ChargeOne — MongoDB Atlas Connectivity & Verification Tool
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'chargeone';

console.log('='.repeat(60));
console.log('⚡ ChargeOne MongoDB Atlas Verification Tool');
console.log('='.repeat(60));

if (!uri) {
  console.error('❌ MONGODB_URI is not set in environment or .env file!');
  process.exit(1);
}

const maskedUri = uri.replace(/:[^:]*@/, ':****@');
console.log(`📡 Connecting to: ${maskedUri}`);
console.log(`📂 Database: ${dbName}`);

const startTime = Date.now();
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 15000,
});

try {
  await client.connect();
  const latency = Date.now() - startTime;
  console.log(`✅ Connected successfully in ${latency}ms!`);

  const db = client.db(dbName);
  const pingRes = await db.command({ ping: 1 });
  console.log(`🏓 Ping response:`, pingRes);

  const collections = await db.listCollections().toArray();
  console.log(`\n📊 Collections in "${dbName}" (${collections.length} total):`);

  if (collections.length === 0) {
    console.log('   (No collections found yet — will be seeded on first startup or via npm run db:seed)');
  } else {
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`   - ${col.name.padEnd(20)}: ${count} documents`);
    }
  }

  // Quick read/write test
  console.log('\n🧪 Testing write & read operations...');
  const testCol = db.collection('_healthcheck');
  const testDoc = { testId: 'verify_' + Date.now(), timestamp: new Date().toISOString(), status: 'OK' };
  await testCol.insertOne(testDoc);
  const fetched = await testCol.findOne({ testId: testDoc.testId });
  if (fetched && fetched.status === 'OK') {
    console.log(`✅ Write/Read test passed! Created and read doc: ${testDoc.testId}`);
    await testCol.deleteOne({ testId: testDoc.testId });
  } else {
    console.error('❌ Write/Read test failed');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 MongoDB Atlas Cloud Database is FULLY OPERATIONAL!');
  console.log('='.repeat(60));
} catch (err) {
  console.error('\n❌ MongoDB Connection Error:', err.message);
  process.exit(1);
} finally {
  await client.close();
}
