import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;
let isInMemory = false;

export async function connectDatabase(): Promise<boolean> {
  if (isConnected) {
    return true;
  }

  // 1. Try real MongoDB connection if configured
  if (env.MONGODB_URI) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 2500, // Short timeout for rapid fallback
      });
      isConnected = true;
      console.log(`[Database] Connected successfully to MongoDB at ${env.MONGODB_URI}`);
      return true;
    } catch (err) {
      console.warn(`[Database] Could not connect to external MongoDB: ${(err as Error).message}. Attempting graceful fallback...`);
    }
  }

  // 2. Fallback to MongoMemoryServer for standalone demo / hackathon evaluation
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    isConnected = true;
    isInMemory = true;
    console.log(`[Database] Standalone Embedded Memory MongoDB started at ${uri}`);
    return true;
  } catch (memErr) {
    console.error(`[Database] Memory MongoDB fallback also failed: ${(memErr as Error).message}`);
    isConnected = false;
    return false;
  }
}

export function getDatabaseStatus(): { connected: boolean; inMemory: boolean } {
  return {
    connected: isConnected && mongoose.connection.readyState === 1,
    inMemory: isInMemory,
  };
}
