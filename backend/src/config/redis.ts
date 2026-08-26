import Redis from 'ioredis';
import { env } from './env.js';

let redis: Redis | null = null;
let redisAvailable = false;

export function getRedisClient(): Redis | null {
  if (!env.REDIS_URL) {
    console.warn('Redis URL not configured - running without Redis');
    return null;
  }

  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('Redis connection failed - running without Redis');
          redisAvailable = false;
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redis.on('error', (error) => {
      if (!redisAvailable) return; // Don't spam errors
      console.error('Redis connection error:', error.message);
      redisAvailable = false;
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
      redisAvailable = true;
    });

    redis.on('ready', () => {
      console.log('Redis ready to accept commands');
      redisAvailable = true;
    });
  }

  return redis;
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    console.log('Skipping Redis connection - not configured');
    return;
  }

  try {
    await client.connect();
    redisAvailable = true;
  } catch (error) {
    console.warn('Redis connection failed - app will run without caching:', (error as Error).message);
    redisAvailable = false;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch {
      // Ignore disconnect errors
    }
    redis = null;
    redisAvailable = false;
    console.log('Redis disconnected');
  }
}

export { redis };
