#!/usr/bin/env node

/**
 * Background worker for running Kimi reviews
 * Invoked by kimi-companion.mjs via fork()
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { invokeKimi } from '../lib/kimi-cli-wrapper.mjs';
import { parseReviewOutput } from '../lib/output-parser.mjs';
import { writeRawOutput } from '../lib/job-store.mjs';
import { updateJob, markJobCompleted, markJobFailed } from './job-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load prompt template
 */
function loadPrompt(kind, diff) {
  const promptPath = join(__dirname, '..', 'prompts', `kimi-${kind}.md`);
  const template = readFileSync(promptPath, 'utf8');
  return template.replace('{{DIFF}}', diff);
}

/**
 * Main worker execution
 */
async function runWorker() {
  const [repoRoot, jobId, kind, model, diff] = process.argv.slice(2);

  try {
    // Update phase
    updateJob(repoRoot, jobId, { phase: 'Loading prompt' });

    const prompt = loadPrompt(kind, diff);

    // Update phase
    updateJob(repoRoot, jobId, { phase: 'Analyzing code' });

    // Invoke Kimi
    const result = await invokeKimi({
      prompt,
      model,
      sessionId: null,
      cwd: repoRoot,
      timeout: 600000, // 10 minute timeout for background jobs
      onProgress: (event) => {
        updateJob(repoRoot, jobId, {
          phase: `Using ${event.tool || 'tool'}...`
        });
      }
    });

    // Update phase
    updateJob(repoRoot, jobId, { phase: 'Parsing results' });

    // Parse output
    const parsed = parseReviewOutput(result.ndjson);

    // Save results
    markJobCompleted(repoRoot, jobId, parsed);

  } catch (err) {
    // Save error
    markJobFailed(repoRoot, jobId, err.message);

    // Try to save raw output for debugging
    try {
      writeRawOutput(repoRoot, jobId, err.toString());
    } catch {
      // Ignore
    }

    process.exit(1);
  }
}

runWorker().catch((err) => {
  console.error('Worker error:', err);
  process.exit(1);
});
