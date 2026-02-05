/**
 * Cleanup Job
 *
 * Performs maintenance and cleanup tasks
 */

import { Job } from 'bullmq';

interface CleanupPayload {
  target: 'logs' | 'temp' | 'cache' | 'all';
  olderThanDays?: number;
  dryRun?: boolean;
}

export async function cleanupJob(job: Job<CleanupPayload>): Promise<{ cleaned: number; targets: string[] }> {
  const { target, olderThanDays = 7, dryRun = false } = job.data;

  await job.log(`Starting cleanup: target=${target}, olderThan=${olderThanDays} days, dryRun=${dryRun}`);
  await job.updateProgress(10);

  const targets: string[] = [];
  let cleaned = 0;

  // Determine targets
  if (target === 'all' || target === 'logs') {
    targets.push('logs');
  }
  if (target === 'all' || target === 'temp') {
    targets.push('temp');
  }
  if (target === 'all' || target === 'cache') {
    targets.push('cache');
  }

  // Process each target
  for (let i = 0; i < targets.length; i++) {
    const currentTarget = targets[i];
    await job.log(`Cleaning ${currentTarget}...`);

    // Simulate cleanup work
    await sleep(1000);

    // Simulate items cleaned
    const itemsCleaned = Math.floor(Math.random() * 100) + 10;
    cleaned += itemsCleaned;

    await job.log(`${dryRun ? '[DRY RUN] Would clean' : 'Cleaned'} ${itemsCleaned} ${currentTarget} items`);

    const progress = Math.round(((i + 1) / targets.length) * 90) + 10;
    await job.updateProgress(progress);
  }

  await job.updateProgress(100);
  await job.log(`Cleanup complete: ${cleaned} items ${dryRun ? 'would be' : ''} removed`);

  return {
    cleaned,
    targets,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
