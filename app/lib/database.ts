import { Db, ObjectId, Collection, MongoClient } from "mongodb";

import type {
  User,
  Company,
  Deposit,
  Dividend,
  Transaction,
  PortfolioEntry,
} from "./types";

import { DATABASE_CONFIG } from "./config";

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

let client: MongoClient | null = null;
let globalDb: Db | null = null;

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

export async function connectToGlobalDatabase(): Promise<Db> {
  if (globalDb) {
    return globalDb;
  }

  const { uri, dbName } = getDatabaseConfig();

  try {
    client = new MongoClient(uri);
    await client.connect();
    globalDb = client.db(dbName);
    return globalDb;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function connectToUserDatabase(userId: string): Promise<Db> {
  const { uri, dbName } = getDatabaseConfig();

  try {
    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
    }

    const userDbName = `${dbName}_user_${userId}`;
    return client.db(userDbName);
  } catch (error) {
    console.error("Failed to connect to user database:", error);
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
