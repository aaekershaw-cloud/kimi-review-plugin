/**
 * Git operations for extracting diffs and detecting changes
 */

import { execSync } from 'child_process';

/**
 * Detect what types of changes exist in the working tree
 * @returns {Object} { staged: boolean, unstaged: boolean }
 */
export function detectDiffScope() {
  try {
    // git diff --cached --quiet returns 0 if no staged changes
    execSync('git diff --cached --quiet', { stdio: 'ignore' });
    const hasStaged = false;

    // git diff --quiet returns 0 if no unstaged changes
    try {
      execSync('git diff --quiet', { stdio: 'ignore' });
      return { staged: hasStaged, unstaged: false };
    } catch {
      return { staged: hasStaged, unstaged: true };
    }
  } catch {
    // First command failed, so there are staged changes
    try {
      execSync('git diff --quiet', { stdio: 'ignore' });
      return { staged: true, unstaged: false };
    } catch {
      return { staged: true, unstaged: true };
    }
  }
}

/**
 * Get git diff based on options
 * @param {Object} options
 * @param {boolean} options.staged - Only staged changes
 * @param {string} options.branch - Compare against branch
 * @param {string} options.base - Custom git base reference
 * @returns {string} Git diff output
 */
export function getDiff(options = {}) {
  const { staged = false, branch = null, base = null } = options;

  let cmd = 'git diff';

  if (staged) {
    cmd += ' --cached';
  } else if (branch) {
    cmd += ` ${branch}...HEAD`;
  } else if (base) {
    cmd += ` ${base}..HEAD`;
  }

  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  } catch (error) {
    if (error.status === 128) {
      throw new Error('Not a git repository');
    }
    throw error;
  }
}

/**
 * Get the repository root directory
 * @returns {string} Absolute path to repo root
 */
export function getRepoRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  } catch (error) {
    throw new Error('Not a git repository');
  }
}

/**
 * Check if working tree is clean (no changes)
 * @returns {boolean}
 */
export function isWorkingTreeClean() {
  try {
    execSync('git diff --quiet', { stdio: 'ignore' });
    execSync('git diff --cached --quiet', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Count lines changed in a diff
 * @param {string} diffOutput - Raw git diff output
 * @returns {number} Approximate lines of code changed
 */
export function countDiffLines(diffOutput) {
  const lines = diffOutput.split('\n');
  let count = 0;

  for (const line of lines) {
    // Count added/removed lines (start with + or -)
    // Ignore diff headers (+++, ---)
    if ((line.startsWith('+') || line.startsWith('-')) &&
        !line.startsWith('+++') &&
        !line.startsWith('---')) {
      count++;
    }
  }

  return count;
}
