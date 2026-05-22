import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redisInstance: Redis | null = null;

export const getRedisConnection = (): Redis => {
  if (!redisInstance) {
    redisInstance = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required parameter for BullMQ workers and queues
    });

    redisInstance.on('connect', () => {
      console.log('Redis connected successfully.');
    });

    redisInstance.on('error', (error) => {
      console.error('Redis connection error:', error);
    });
  }
  return redisInstance;
};
