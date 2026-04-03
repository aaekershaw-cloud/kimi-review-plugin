/**
 * Filesystem-based job state persistence
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';

const JOBS_BASE_DIR = join(homedir(), '.kimi-review', 'jobs');

/**
 * Get hash of repo root for namespacing jobs
 * @param {string} repoRoot - Absolute path to repository root
 * @returns {string} 8-character hash
 */
function getRepoHash(repoRoot) {
  return createHash('sha256').update(repoRoot).digest('hex').substring(0, 8);
}

/**
 * Get directory for a specific job
 * @param {string} repoRoot
 * @param {string} jobId
 * @returns {string} Absolute path to job directory
 */
export function getJobDir(repoRoot, jobId) {
  const repoHash = getRepoHash(repoRoot);
  return join(JOBS_BASE_DIR, repoHash, jobId);
}

/**
 * Ensure job directory exists
 * @param {string} jobDir
 */
function ensureJobDir(jobDir) {
  if (!existsSync(jobDir)) {
    mkdirSync(jobDir, { recursive: true });
  }
}

/**
 * Write job status to disk
 * @param {string} repoRoot
 * @param {string} jobId
 * @param {Object} status
 */
export function writeJobStatus(repoRoot, jobId, status) {
  const jobDir = getJobDir(repoRoot, jobId);
  ensureJobDir(jobDir);

  const statusPath = join(jobDir, 'status.json');
  writeFileSync(statusPath, JSON.stringify(status, null, 2), 'utf8');
}

/**
 * Read job status from disk
 * @param {string} repoRoot
 * @param {string} jobId
 * @returns {Object|null}
 */
export function readJobStatus(repoRoot, jobId) {
  const jobDir = getJobDir(repoRoot, jobId);
  const statusPath = join(jobDir, 'status.json');

  if (!existsSync(statusPath)) {
    return null;
  }

  try {
    const content = readFileSync(statusPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read job status: ${error.message}`);
    return null;
  }
}

/**
 * Write job result to disk
 * @param {string} repoRoot
 * @param {string} jobId
 * @param {Object} result
 */
export function writeJobResult(repoRoot, jobId, result) {
  const jobDir = getJobDir(repoRoot, jobId);
  ensureJobDir(jobDir);

  const resultPath = join(jobDir, 'result.json');
  writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
}

/**
 * Read job result from disk
 * @param {string} repoRoot
 * @param {string} jobId
 * @returns {Object|null}
 */
export function readJobResult(repoRoot, jobId) {
  const jobDir = getJobDir(repoRoot, jobId);
  const resultPath = join(jobDir, 'result.json');

  if (!existsSync(resultPath)) {
    return null;
  }

  try {
    const content = readFileSync(resultPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read job result: ${error.message}`);
    return null;
  }
}

/**
 * Write raw output to disk (for debugging malformed output)
 * @param {string} repoRoot
 * @param {string} jobId
 * @param {string} output
 */
export function writeRawOutput(repoRoot, jobId, output) {
  const jobDir = getJobDir(repoRoot, jobId);
  ensureJobDir(jobDir);

  const outputPath = join(jobDir, 'raw-output.txt');
  writeFileSync(outputPath, output, 'utf8');
}

/**
 * List all jobs for a repository
 * @param {string} repoRoot
 * @returns {Array<Object>} Array of job status objects
 */
export function listJobs(repoRoot) {
  const repoHash = getRepoHash(repoRoot);
  const repoJobsDir = join(JOBS_BASE_DIR, repoHash);

  if (!existsSync(repoJobsDir)) {
    return [];
  }

  const jobDirs = readdirSync(repoJobsDir);
  const jobs = [];

  for (const jobId of jobDirs) {
    const status = readJobStatus(repoRoot, jobId);
    if (status) {
      jobs.push({ jobId, ...status });
    }
  }

  // Sort by started_at descending (most recent first)
  return jobs.sort((a, b) => {
    const aTime = new Date(a.started_at).getTime();
    const bTime = new Date(b.started_at).getTime();
    return bTime - aTime;
  });
}

/**
 * Clean up job files
 * @param {string} repoRoot
 * @param {string} jobId
 */
export function deleteJob(repoRoot, jobId) {
  const jobDir = getJobDir(repoRoot, jobId);

  if (!existsSync(jobDir)) {
    return;
  }

  // Delete all files in job directory
  const files = readdirSync(jobDir);
  for (const file of files) {
    unlinkSync(join(jobDir, file));
  }

  // Delete directory itself
  try {
    require('fs').rmdirSync(jobDir);
  } catch (error) {
    // Ignore errors (directory might not be empty)
  }
}
