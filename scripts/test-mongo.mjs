/**
 * Test MongoDB access (main DB + per-user DB).
 *
 * Usage:
 *   npm run test-mongo
 *   npm run test-mongo -- <userId>
 *   npm run test-mongo -- <userId> --write
 *
 * Examples:
 *   npm run test-mongo
 *   npm run test-mongo -- c79076b2-7efa-46ef-96fa-5e90a5a2faaf6
 *   npm run test-mongo -- c79076b2-7efa-46ef-96fa-5e90a5a2faaf6 --write
 *
 * Use the same MONGODB_URI / MONGODB_DB_NAME as Vercel (.env.local or env pull).
 */

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;
const args = process.argv.slice(2);
const writeProbe = args.includes("--write");
const userId = args.find((arg) => !arg.startsWith("--"));

if (!uri || !dbName) {
  console.error("Missing MONGODB_URI or MONGODB_DB_NAME in environment.");
  process.exit(1);
}

function getUserDatabaseName(baseName, id) {
  const prefix = baseName.slice(0, 3);
  return `${prefix}_u_${id.replace(/-/g, "")}`;
}

const client = new MongoClient(uri, {
  maxIdleTimeMS: 60_000,
  serverSelectionTimeoutMS: 10_000,
});

try {
  await client.connect();
  console.log("Connected to cluster.\n");

  const mainDb = client.db(dbName);
  await mainDb.command({ ping: 1 });

  const users = await mainDb
    .collection("users")
    .find({}, { projection: { email: 1, id: 1, name: 1 } })
    .toArray();

  console.log(`Main DB "${dbName}": OK`);
  console.log(`  users: ${users.length}`);
  for (const user of users) {
    console.log(`    - ${user.email} (id: ${user.id})`);
  }

  if (!userId) {
    console.log("\nPass a userId to test per-user DB:");
    console.log("  npm run test-mongo -- <userId>");
    console.log("\nOptional: write a probe doc (makes fin_u_* visible in Atlas):");
    console.log("  npm run test-mongo -- <userId> --write");
    process.exit(0);
  }

  const userDbName = getUserDatabaseName(dbName, userId);
  console.log(`\nPer-user DB (${userDbName.length} chars): ${userDbName}`);

  const userDb = client.db(userDbName);
  const companies = await userDb.collection("companies").find({}).toArray();
  console.log(`  companies.find(): OK (${companies.length} documents)`);

  if (writeProbe) {
    const probe = {
      instrument: "__probe__",
      isin: "PROBE00000000",
      issuer: "Mongo test probe (safe to delete)",
    };
    const insert = await userDb.collection("companies").insertOne(probe);
    console.log(`  companies.insertOne(): OK (_id: ${insert.insertedId})`);
    await userDb.collection("companies").deleteOne({ _id: insert.insertedId });
    console.log("  probe deleted (DB may still show in Atlas until refresh)");
  }

  console.log(
    "\nNote: Atlas lists a database after the first write, not after create-user or read-only.",
  );
} catch (error) {
  console.error("\nFAILED:");
  console.error(error);
  process.exit(1);
} finally {
  await client.close();
}
