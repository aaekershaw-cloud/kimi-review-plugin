#!/usr/bin/env node

/**
 * Main command router for Kimi review plugin
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDiff, getRepoRoot, isWorkingTreeClean, countDiffLines } from '../lib/git-diff.mjs';
import { estimateScope, getScopeDescription, recommendMode, recommendModel, exceedsSafeLimit } from '../lib/scope-estimator.mjs';
import { invokeKimi, findKimiBinary } from '../lib/kimi-cli-wrapper.mjs';
import { parseReviewOutput } from '../lib/output-parser.mjs';
import { listJobs, readJobStatus, readJobResult, writeRawOutput } from '../lib/job-store.mjs';
import { createJob, updateJob, markJobRunning, markJobCompleted, markJobFailed, cancelJob, formatJobStatus, getElapsedTime } from './job-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse command-line arguments
 */
function parseArgs(args) {
  const options = {
    command: args[0] || 'review',
    wait: false,
    background: false,
    staged: false,
    branch: null,
    base: null,
    model: 'moonshot-v1-8k',
    jobId: null
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--wait') {
      options.wait = true;
    } else if (arg === '--background') {
      options.background = true;
    } else if (arg === '--staged') {
      options.staged = true;
    } else if (arg === '--branch' && args[i + 1]) {
      options.branch = args[++i];
    } else if (arg === '--base' && args[i + 1]) {
      options.base = args[++i];
    } else if (arg === '--model' && args[i + 1]) {
      options.model = args[++i];
    } else if (!options.jobId && !arg.startsWith('--')) {
      options.jobId = arg;
    }
  }

  return options;
}

/**
 * Load prompt template and inject diff
 */
function loadPrompt(kind, diff) {
  const promptPath = join(__dirname, '..', 'prompts', `kimi-${kind}.md`);
  const template = readFileSync(promptPath, 'utf8');
  return template.replace('{{DIFF}}', diff);
}

/**
 * Format review findings for display
 */
function formatFindings(result) {
  const lines = [];

  lines.push(`\n## Review Result: ${result.verdict.toUpperCase()}\n`);
  lines.push(result.summary);
  lines.push('');

  if (result.findings.length === 0) {
    lines.push('No issues found.');
  } else {
    lines.push(`### Findings (${result.findings.length})\n`);

    for (const finding of result.findings) {
      const severity = finding.severity.toUpperCase();
      const confidence = finding.confidence ? ` (confidence: ${finding.confidence})` : '';
      lines.push(`**[${severity}${confidence}]** ${finding.title}`);
      lines.push(`  File: ${finding.file}:${finding.line_start}-${finding.line_end}`);
      lines.push(`  ${finding.body}`);
      if (finding.recommendation) {
        lines.push(`  → ${finding.recommendation}`);
      }
      lines.push('');
    }
  }

  if (result.next_steps && result.next_steps.length > 0) {
    lines.push('### Next Steps\n');
    for (const step of result.next_steps) {
      lines.push(`- ${step}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Command: review or adversarial-review
 */
async function cmdReview(options) {
  // Check Kimi CLI availability
  const binary = findKimiBinary();
  if (!binary) {
    console.error('Error: Kimi CLI not found in PATH.\n');
    console.error('Install Kimi:');
    console.error('  npm install -g @moonshot-ai/kimi-cli');
    console.error('  # or');
    console.error('  curl -sSL https://moonshot.cn/install.sh | sh\n');
    console.error('Then verify: kimi --version');
    process.exit(1);
  }

  // Get repo root
  let repoRoot;
  try {
    repoRoot = getRepoRoot();
  } catch (err) {
    console.error('Error: Not a git repository');
    process.exit(1);
  }

  // Check for changes
  if (isWorkingTreeClean() && !options.branch && !options.base) {
    console.error('No changes to review. Working tree is clean.\n');
    console.error('To review staged changes: /kimi:review --staged');
    console.error('To review a branch: /kimi:review --branch feature-name');
    process.exit(1);
  }

  // Get diff
  const diff = getDiff({
    staged: options.staged,
    branch: options.branch,
    base: options.base
  });

  if (!diff.trim()) {
    console.error('No changes found in diff');
    process.exit(1);
  }

  // Estimate scope
  const locChanged = countDiffLines(diff);
  const scopeDesc = getScopeDescription(locChanged);
  const recommendedModel = recommendModel(locChanged);

  console.log(`Diff scope: ${scopeDesc}`);

  // Check if model is appropriate
  if (exceedsSafeLimit(locChanged, options.model)) {
    console.warn(`\nWarning: Diff size (${locChanged} LOC) may exceed safe limits for ${options.model}`);
    console.warn(`Recommended model: ${recommendedModel}\n`);
  }

  // Determine execution mode
  const mode = options.wait ? 'foreground' :
               options.background ? 'background' :
               recommendMode(locChanged, false);

  if (mode === 'background') {
    console.log('\nLarge diff detected. Running in background...');
    const jobId = await runInBackground(repoRoot, options.command, diff, options.model);
    console.log(`\nJob started: ${jobId}`);
    console.log(`Check status: /kimi:status ${jobId}`);
    console.log(`Get results: /kimi:result ${jobId}`);
    return;
  }

  // Foreground execution
  console.log(`\nRunning ${options.command} review...`);

  const prompt = loadPrompt(options.command, diff);

  try {
    const result = await invokeKimi({
      prompt,
      model: options.model,
      sessionId: null, // Fresh session for each review
      cwd: repoRoot,
      timeout: 300000,
      onProgress: (event) => {
        process.stdout.write('.');
      }
    });

    process.stdout.write('\n');

    // Parse output
    const parsed = parseReviewOutput(result.ndjson);

    // Display results
    console.log(formatFindings(parsed));

  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Run review in background
 */
async function runInBackground(repoRoot, kind, diff, model) {
  const jobId = createJob(repoRoot, kind, {
    summary: `Reviewing ${countDiffLines(diff)} LOC`,
    model
  });

  // Fork a child process to run the review
  const { fork } = await import('child_process');
  const workerPath = join(__dirname, 'review-worker.mjs');

  const child = fork(workerPath, [
    repoRoot,
    jobId,
    kind,
    model,
    diff
  ], {
    detached: true,
    stdio: 'ignore'
  });

  child.unref();

  markJobRunning(repoRoot, jobId, child.pid, 'Analyzing diff');

  return jobId;
}

/**
 * Command: status
 */
function cmdStatus(options) {
  let repoRoot;
  try {
    repoRoot = getRepoRoot();
  } catch (err) {
    console.error('Error: Not a git repository');
    process.exit(1);
  }

  if (options.jobId) {
    // Show detailed status for specific job
    const status = readJobStatus(repoRoot, options.jobId);
    if (!status) {
      console.error(`Job not found: ${options.jobId}`);
      process.exit(1);
    }

    console.log('\n## Job Status\n');
    console.log(`ID:       ${status.job_id}`);
    console.log(`Kind:     ${status.kind}`);
    console.log(`Status:   ${status.status}`);
    console.log(`Phase:    ${status.phase}`);
    console.log(`Started:  ${status.started_at}`);

    if (status.completed_at) {
      console.log(`Completed: ${status.completed_at}`);
      console.log(`Duration:  ${status.duration_seconds}s`);
    } else {
      console.log(`Elapsed:   ${getElapsedTime(status.started_at)}`);
    }

    if (status.error) {
      console.log(`Error:     ${status.error}`);
    }

    console.log('');

  } else {
    // List all jobs
    const jobs = listJobs(repoRoot);

    if (jobs.length === 0) {
      console.log('No jobs found for this repository');
      return;
    }

    console.log('\n## Jobs\n');
    console.log('Job ID                | Kind              | Status    | Phase           | Elapsed');
    console.log('----------------------|-------------------|-----------|-----------------|----------');

    for (const job of jobs) {
      console.log(formatJobStatus(job));
    }

    console.log('');
  }
}

/**
 * Command: result
 */
function cmdResult(options) {
  if (!options.jobId) {
    console.error('Error: Job ID required\n');
    console.error('Usage: /kimi:result <job-id>');
    process.exit(1);
  }

  let repoRoot;
  try {
    repoRoot = getRepoRoot();
  } catch (err) {
    console.error('Error: Not a git repository');
    process.exit(1);
  }

  const result = readJobResult(repoRoot, options.jobId);
  if (!result) {
    const status = readJobStatus(repoRoot, options.jobId);
    if (!status) {
      console.error(`Job not found: ${options.jobId}`);
    } else if (status.status === 'running') {
      console.error(`Job ${options.jobId} is still running`);
      console.error(`Check status: /kimi:status ${options.jobId}`);
    } else if (status.status === 'failed') {
      console.error(`Job ${options.jobId} failed: ${status.error}`);
    } else {
      console.error(`No results available for job: ${options.jobId}`);
    }
    process.exit(1);
  }

  console.log(formatFindings(result));
}

/**
 * Command: cancel
 */
function cmdCancel(options) {
  if (!options.jobId) {
    console.error('Error: Job ID required\n');
    console.error('Usage: /kimi:cancel <job-id>');
    process.exit(1);
  }

  let repoRoot;
  try {
    repoRoot = getRepoRoot();
  } catch (err) {
    console.error('Error: Not a git repository');
    process.exit(1);
  }

  const cancelled = cancelJob(repoRoot, options.jobId);

  if (cancelled) {
    console.log(`Job ${options.jobId} cancelled`);
  } else {
    console.error(`Could not cancel job ${options.jobId} (not running or not found)`);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  switch (options.command) {
    case 'review':
    case 'adversarial-review':
      await cmdReview(options);
      break;
    case 'status':
      cmdStatus(options);
      break;
    case 'result':
      cmdResult(options);
      break;
    case 'cancel':
      cmdCancel(options);
      break;
    default:
      console.error(`Unknown command: ${options.command}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
