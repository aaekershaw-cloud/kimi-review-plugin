/**
 * Background job lifecycle management
 */

import { randomUUID } from 'crypto';
import { fork } from 'child_process';
import { writeJobStatus, readJobStatus, writeJobResult } from '../lib/job-store.mjs';

/**
 * Create a new job
 * @param {string} repoRoot
 * @param {string} kind - 'review' | 'adversarial-review' | 'rescue'
 * @param {Object} metadata - Additional job metadata
 * @returns {string} Job ID
 */
export function createJob(repoRoot, kind, metadata = {}) {
  const jobId = `kimi-${kind}-${randomUUID().substring(0, 8)}`;

  const status = {
    job_id: jobId,
    kind,
    status: 'pending',
    phase: 'Initializing',
    started_at: new Date().toISOString(),
    completed_at: null,
    duration_seconds: null,
    pid: null,
    repo_root: repoRoot,
    session_id: randomUUID(),
    summary: metadata.summary || `Starting ${kind} job`,
    ...metadata
  };

  writeJobStatus(repoRoot, jobId, status);
  return jobId;
}

/**
 * Update job status
 * @param {string} repoRoot
 * @param {string} jobId
 * @param {Object} updates - Status fields to update
 */
export function updateJob(repoRoot, jobId, updates) {
  const current = readJobStatus(repoRoot, jobId);
  if (!current) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const updated = {
    ...current,
    ...updates
  };

  // Auto-calculate duration if completing
  if (updates.status === 'completed' || updates.status === 'failed' || updates.status === 'cancelled') {
    updated.completed_at = new Date().toISOString();
    const startTime = new Date(current.started_at).getTime();
    const endTime = new Date(updated.completed_at).getTime();
    updated.duration_seconds = Math.round((endTime - startTime) / 1000);
  }

  writeJobStatus(repoRoot, jobId, updated);
}

/**
 * Mark job as running
 * @param {string} repoRoot
 * @param {string} jobId
 * @param {number} pid - Process ID
 * @param {string} phase - Current phase description
 */
export function markJobRunning(repoRoot, jobId, pid, phase = 'Running') {
  updateJob(repoRoot, jobId, {
    status: 'running',
    phase,
    pid
  });
}

/**
 * Mark job as completed
 * @param {string} repoRoot
 * @param {string} jobId
 * @param {Object} result - Review result to save
 */
export function markJobCompleted(repoRoot, jobId, result) {
  writeJobResult(repoRoot, jobId, result);
  updateJob(repoRoot, jobId, {
    status: 'completed',
    phase: 'Complete'
  });
}

/**
 * Mark job as failed
 * @param {string} repoRoot
 * @param {string} jobId
 * @param {string} error - Error message
 */
export function markJobFailed(repoRoot, jobId, error) {
  updateJob(repoRoot, jobId, {
    status: 'failed',
    phase: 'Failed',
    error
  });
}

/**
 * Cancel a running job
 * @param {string} repoRoot
 * @param {string} jobId
 * @returns {boolean} True if job was cancelled
 */
export function cancelJob(repoRoot, jobId) {
  const status = readJobStatus(repoRoot, jobId);
  if (!status) {
    return false;
  }

  if (status.status !== 'running') {
    return false;
  }

  // Kill the process if it's running
  if (status.pid) {
    try {
      process.kill(status.pid, 'SIGTERM');
    } catch (err) {
      // Process might already be dead
    }
  }

  updateJob(repoRoot, jobId, {
    status: 'cancelled',
    phase: 'Cancelled'
  });

  return true;
}

/**
 * Get human-readable elapsed time
 * @param {string} startedAt - ISO timestamp
 * @returns {string}
 */
export function getElapsedTime(startedAt) {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const elapsed = Math.round((now - start) / 1000);

  if (elapsed < 60) return `${elapsed}s`;
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Format job status for display
 * @param {Object} job - Job status object
 * @returns {string} Formatted status line
 */
export function formatJobStatus(job) {
  const elapsed = job.completed_at
    ? `${job.duration_seconds}s`
    : getElapsedTime(job.started_at);

  return `${job.job_id} | ${job.kind} | ${job.status} | ${job.phase} | ${elapsed}`;
}
