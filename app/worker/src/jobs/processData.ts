/**
 * Process Data Job
 *
 * Simulates data processing tasks
 */

import { Job } from 'bullmq';

interface ProcessDataPayload {
  dataId?: string;
  operation?: string;
  items?: unknown[];
}

export async function processDataJob(job: Job<ProcessDataPayload>): Promise<{ processed: number }> {
  const { dataId, operation = 'default', items = [] } = job.data;

  // Log job start
  await job.log(`Starting data processing for ${dataId || 'batch'}`);
  await job.updateProgress(0);

  // Simulate processing steps
  const totalSteps = items.length || 5;

  for (let i = 0; i < totalSteps; i++) {
    // Simulate work
    await sleep(500 + Math.random() * 500);

    // Update progress
    const progress = Math.round(((i + 1) / totalSteps) * 100);
    await job.updateProgress(progress);
    await job.log(`Processed step ${i + 1}/${totalSteps}`);
  }

  await job.log(`Completed ${operation} operation`);

  return {
    processed: totalSteps,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
