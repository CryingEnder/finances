import { Db, ObjectId, Collection, MongoClient } from "mongodb";

import type {
  Etf,
  User,
  Company,
  Deposit,
  Dividend,
  FundUnit,
  Transaction,
  PortfolioEntry,
} from "./types";

import { DATABASE_CONFIG } from "./config";
import { captureServerError } from "./capture-error";

type DatabaseCompany = Omit<Company, "_id" | "userId"> & { _id?: ObjectId };
type DatabasePortfolioEntry = Omit<PortfolioEntry, "_id" | "userId"> & {
  _id?: ObjectId;
};
export type DatabaseDividend = Omit<Dividend, "_id" | "userId"> & {
  _id?: ObjectId;
};
type DatabaseDeposit = Omit<Deposit, "_id" | "userId"> & { _id?: ObjectId };
export type DatabaseTransaction = Omit<Transaction, "_id" | "userId"> & {
  _id?: ObjectId;
};
type DatabaseEtf = Omit<Etf, "_id" | "userId"> & { _id?: ObjectId };
type DatabaseFundUnit = Omit<FundUnit, "_id" | "userId"> & { _id?: ObjectId };

const globalMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ECONNRESET",
]);

export function isDatabaseConnectionError(error: unknown): boolean {
  if (!error || "object" !== typeof error) {
    return false;
  }

  const err = error as { code?: string; name?: string; message?: string };

  if (err.code && CONNECTION_ERROR_CODES.has(err.code)) {
    return true;
  }

  if (
    "MongoServerSelectionError" === err.name ||
    "MongoNetworkError" === err.name
  ) {
    return true;
  }

  const message = err.message ?? "";
  return (
    message.includes("querySrv") ||
    message.includes("ENOTFOUND") ||
    message.includes("ECONNREFUSED") ||
    message.includes("failed to connect") ||
    message.includes("Topology is closed")
  );
}

const getDatabaseConfig = (): { uri: string; dbName: string } => {
  const uri = DATABASE_CONFIG.MONGODB_URI;
  const dbName = DATABASE_CONFIG.MONGODB_DB_NAME;

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  if (!dbName) {
    throw new Error("MONGODB_DB_NAME environment variable is not set");
  }

  return { uri, dbName };
};

function clearMongoClientPromise(): void {
  globalMongo.mongoClientPromise = undefined;
}

async function getMongoClient(reconnect = false): Promise<MongoClient> {
  const { uri, dbName } = getDatabaseConfig();

  if (reconnect) {
    clearMongoClientPromise();
  }

  if (!globalMongo.mongoClientPromise) {
    globalMongo.mongoClientPromise = new MongoClient(uri).connect();
  }

  try {
    const client = await globalMongo.mongoClientPromise;
    await client.db(dbName).command({ ping: 1 });
    return client;
  } catch (error) {
    clearMongoClientPromise();

    if (!reconnect) {
      return await getMongoClient(true);
    }

    throw error;
  }
}

// per-user DB name (max 64 chars)
export function getUserDatabaseName(userId: string): string {
  const { dbName } = getDatabaseConfig();
  const compactUserId = userId.replace(/-/g, "");
  return `${dbName}_u_${compactUserId}`;
}

export async function connectToGlobalDatabase(): Promise<Db> {
  const { dbName } = getDatabaseConfig();

  try {
    const mongoClient = await getMongoClient();
    return mongoClient.db(dbName);
  } catch (error) {
    captureServerError(error, { message: "Failed to connect to MongoDB" });
    throw error;
  }
}

export async function connectToUserDatabase(userId: string): Promise<Db> {
  try {
    const mongoClient = await getMongoClient();
    return mongoClient.db(getUserDatabaseName(userId));
  } catch (error) {
    captureServerError(error, {
      message: "Failed to connect to user database",
    });
    throw error;
  }
}

export async function getUsersCollection(): Promise<
  Collection<User & { password: string }>
> {
  const database = await connectToGlobalDatabase();
  return database.collection<User & { password: string }>("users");
}

export async function getCompaniesCollection(
  userId: string,
): Promise<Collection<DatabaseCompany>> {
  const database = await connectToUserDatabase(userId);
  return database.collection<DatabaseCompany>("companies");
}

export async function getPortfolioCollection(
  userId: string,
): Promise<Collection<DatabasePortfolioEntry>> {
  const database = await connectToUserDatabase(userId);
  return database.collection<DatabasePortfolioEntry>("portfolio");
}

export async function getDepositsCollection(
  userId: string,
): Promise<Collection<DatabaseDeposit>> {
  const database = await connectToUserDatabase(userId);
  return database.collection<DatabaseDeposit>("deposits");
}

export async function getDividendsCollection(
  userId: string,
): Promise<Collection<DatabaseDividend>> {
  const database = await connectToUserDatabase(userId);
  return database.collection<DatabaseDividend>("dividends");
}

export async function getTransactionsCollection(
  userId: string,
): Promise<Collection<DatabaseTransaction>> {
  const database = await connectToUserDatabase(userId);
  return database.collection<DatabaseTransaction>("transactions");
}

export async function getEtfsCollection(
  userId: string,
): Promise<Collection<DatabaseEtf>> {
  const database = await connectToUserDatabase(userId);
  return database.collection<DatabaseEtf>("etfs");
}

export async function getFundUnitsCollection(
  userId: string,
): Promise<Collection<DatabaseFundUnit>> {
  const database = await connectToUserDatabase(userId);
  return database.collection<DatabaseFundUnit>("fundUnits");
}
