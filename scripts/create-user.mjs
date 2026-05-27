import { randomUUID } from "node:crypto";

import bcrypt from "bcrypt";

import { MongoClient } from "mongodb";

const BCRYPT_ROUNDS = 12;

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] ?? email.split("@")[0];

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

if (!email || !password) {
  console.error(
    "Usage: node --env-file=.env.local scripts/create-user.mjs <email> <password> [name]",
  );
  process.exit(1);
}

if (!uri || !dbName) {
  console.error("Missing MONGODB_URI or MONGODB_DB_NAME in environment.");
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const users = client.db(dbName).collection("users");

  const existing = await users.findOne({ email });
  if (existing) {
    console.error(`User already exists with email: ${email}`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = {
    id: randomUUID(),
    email,
    name,
    password: hashedPassword,
  };

  await users.insertOne(user);

  console.log("User created:");
  console.log(`  id:    ${user.id}`);
  console.log(`  email: ${user.email}`);
  console.log(`  name:  ${user.name}`);
  console.log(`  db:    ${dbName} (collection: users)`);
  console.log(
    `  data:  ${dbName}_user_${user.id} (created when they add portfolio data)`,
  );
} finally {
  await client.close();
}
