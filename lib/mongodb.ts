import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServer?: { uri: string } | null;
}

declare global {
  var __mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.__mongooseCache ?? { conn: null, promise: null, memoryServer: null };

if (!global.__mongooseCache) {
  global.__mongooseCache = cached;
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      const configuredUri = process.env.MONGODB_URI;

      if (configuredUri) {
        try {
          return await mongoose.connect(configuredUri, {
            dbName: "digitaldesk",
          });
        } catch (error) {
          console.warn(
            "[MongoDB] Configured Atlas URI failed; falling back to local in-memory MongoDB.",
            error instanceof Error ? error.message : error
          );
        }
      }

      if (!cached.memoryServer) {
        const memoryServer = await MongoMemoryServer.create({
          binary: {
            version: "7.0.14",
          },
          instance: {
            dbName: "digitaldesk",
          },
        });
        cached.memoryServer = { uri: memoryServer.getUri() };
        process.env.MONGODB_URI = memoryServer.getUri();
      }

      return await mongoose.connect(cached.memoryServer.uri, {
        dbName: "digitaldesk",
      });
    })();
  }

  cached.conn = await cached.promise;

  return cached.conn;
}