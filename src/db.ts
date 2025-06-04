// import { MongoClient, Db, ServerApiVersion } from 'mongodb';

// const uri = process.env.MONGODB_URI;
// const dbName = process.env.MONGODB_DB;

// if (!uri || !dbName) {
//   throw new Error('Missing MONGODB_URI or MONGODB_DB environment variables');
// }

// let cachedClient: MongoClient | null = null;
// let cachedDb: Db | null = null;

// // export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
// //   if (cachedClient && cachedDb) {
// //     return { client: cachedClient, db: cachedDb };
// //   }

// //   const client = new MongoClient(uri as string, {
// //     serverApi: {
// //       version: ServerApiVersion.v1,
// //       strict: true,
// //       deprecationErrors: true,
// //     },
// //   });

// //   // Explicitly connect (v4.7+ can defer this, but we’ll do it here)
// //   await client.connect();

// //   // Ping the target database (not "admin")
// //   await client.db(dbName).command({ ping: 1 });
// //   console.log(`Pinged "${dbName}". You successfully connected to MongoDB!`);

// //   const db = client.db(dbName);

// //   cachedClient = client;
// //   cachedDb = db;

// //   return { client, db };
// // }

import { MongoClient, ServerApiVersion } from "mongodb";
import { resolve } from "styled-jsx/css";

const uri: string = process.env.MONGODB_URI !;
const dbName: string = process.env.MONGODB_DB !;

if (!uri) {
  throw new Error("Missing MongoDB connection string in environment variables.");
}

if (uri === undefined) {
  throw new Error("MONGODB_URI environment variable is undefined");
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },

});

async function run(): Promise<void> {
  try {
    await client.connect();
    // Check connection by pinging the admin database
    await client.db("swift-assess").command({ ping: 1 });
    await client.db("swift-assess").collection("users").createIndex({ id: 1 }, { unique: true });
    await client.db("swift-assess").collection("posts").createIndex({ userId: 1 });
    await client.db("swift-assess").collection("comments").createIndex({ postId: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err: unknown) {
    console.error("MongoDB connection error:", err);
  }
}

run().catch((err: unknown) => {
  console.error("MongoDB connection error:", err);
});

export { client };

