/**
 * Wrapper for spawning Kimi CLI subprocess and parsing NDJSON output
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

/**
 * Check if Kimi CLI is available
 * @returns {string|null} Path to kimi binary or null if not found
 */
export function findKimiBinary() {
  // Check PATH first
  const paths = (process.env.PATH || '').split(':');

  for (const dir of paths) {
    const kimiPath = `${dir}/kimi`;
    try {
      require('fs').accessSync(kimiPath, require('fs').constants.X_OK);
      return kimiPath;
    } catch {
      continue;
    }
  }

  // Check common install locations
  const fallbackPaths = [
    `${process.env.HOME}/.local/bin/kimi`,
    '/usr/local/bin/kimi',
    '/opt/homebrew/bin/kimi'
  ];

  for (const path of fallbackPaths) {
    try {
      require('fs').accessSync(path, require('fs').constants.X_OK);
      return path;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Invoke Kimi CLI with streaming output
 * @param {Object} options
 * @param {string} options.prompt - Full prompt to send to Kimi
 * @param {string} [options.model='moonshot-v1-8k'] - Model to use
 * @param {string} [options.sessionId] - Session ID for continuity
 * @param {string} [options.cwd=process.cwd()] - Working directory
 * @param {number} [options.timeout=300000] - Timeout in milliseconds (5 min default)
 * @param {function} [options.onProgress] - Callback for progress updates
 * @returns {Promise<{text: string, ndjson: string}>}
 */
export async function invokeKimi(options) {
  const {
    prompt,
    model = 'moonshot-v1-8k',
    sessionId = null,
    cwd = process.cwd(),
    timeout = 300000,
    onProgress = null
  } = options;

  const binary = findKimiBinary();
  if (!binary) {
    throw new Error('Kimi CLI not found in PATH or common install locations');
  }

  const args = [
    '--print',
    '--yolo',
    '-p', prompt,
    '--output-format', 'stream-json'
  ];

  if (model && model !== 'default') {
    args.push('--model', model);
  }

  if (sessionId) {
    args.push('--session', sessionId);
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(binary, args, { cwd });

    const ndjsonLines = [];
    const textChunks = [];
    let timedOut = false;
    let stderr = '';

    // Set up timeout
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      reject(new Error(`Kimi CLI timed out after ${timeout / 1000} seconds`));
    }, timeout);

    // Parse stdout line by line
    const rl = createInterface({ input: proc.stdout });

    rl.on('line', (line) => {
      if (!line.trim()) return;

      ndjsonLines.push(line);

      try {
        const obj = JSON.parse(line);

        // Extract text from assistant messages
        if (obj.role === 'assistant') {
          const content = obj.content || [];
          for (const block of content) {
            if (block.type === 'text' && block.text) {
              textChunks.push(block.text);
            }
          }

          // Report tool usage if progress callback provided
          if (onProgress && obj.tool_calls) {
            for (const tc of obj.tool_calls) {
              const fn = tc.function || {};
              onProgress({ tool: fn.name || 'unknown' });
            }
          }
        }
      } catch (err) {
        // Skip non-JSON lines
      }
    });

    // Capture stderr
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutHandle);

      if (timedOut) {
        return; // Already rejected
      }

      if (code !== 0) {
        reject(new Error(`Kimi CLI exited with code ${code}\nStderr: ${stderr}`));
        return;
      }

      resolve({
        text: textChunks.join(''),
        ndjson: ndjsonLines.join('\n')
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutHandle);
      reject(err);
    });
  });
}

/**
 * Kill a running Kimi process by PID
 * @param {number} pid - Process ID to kill
 * @returns {boolean} True if process was killed
 */
export function killProcess(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch (err) {
    return false;
  }
}
