import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import type { User, Company, PortfolioEntry } from "./types";
import { DATABASE_CONFIG } from "./config";

type DatabaseCompany = Omit<Company, "_id"> & { _id?: ObjectId };
type DatabasePortfolioEntry = Omit<PortfolioEntry, "_id"> & { _id?: ObjectId };

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  const uri = DATABASE_CONFIG.MONGODB_URI;
  const dbName = DATABASE_CONFIG.MONGODB_DB_NAME;

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function getUsersCollection(): Promise<
  Collection<User & { password: string }>
> {
  const database = await connectToDatabase();
  return database.collection<User & { password: string }>("users");
}

export async function getCompaniesCollection(): Promise<
  Collection<DatabaseCompany>
> {
  const database = await connectToDatabase();
  return database.collection<DatabaseCompany>("companies");
}

export async function getPortfolioCollection(): Promise<
  Collection<DatabasePortfolioEntry>
> {
  const database = await connectToDatabase();
  return database.collection<DatabasePortfolioEntry>("portfolio");
}
