import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

const connection = getRedisConnection();

// Queue for background AI question generation jobs
export const questionQueue = new Queue('question-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

// Queue for background Puppeteer PDF generation jobs
export const pdfQueue = new Queue('pdf-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});
