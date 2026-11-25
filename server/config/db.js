import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blue_lost_found';

/**
 * Connect to MongoDB with auto-retry and event logging.
 */
export async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`[Database] MongoDB connection error: ${err.message}`);
    // Do not crash the entire process immediately, allow offline mode / retries
    throw err;
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] MongoDB reconnected');
});

export async function disconnectDB() {
  try {
    await mongoose.connection.close();
    console.log('[Database] MongoDB connection closed');
  } catch (err) {
    console.error('[Database] Error closing MongoDB connection:', err.message);
  }
}

export default connectDB;
