/**
 * Estimate scope of changes for mode selection
 */

/**
 * Estimate the scope category of a diff
 * @param {number} locChanged - Lines of code changed
 * @returns {'small'|'medium'|'large'|'xlarge'}
 */
export function estimateScope(locChanged) {
  if (locChanged < 100) return 'small';
  if (locChanged < 500) return 'medium';
  if (locChanged < 2000) return 'large';
  return 'xlarge';
}

/**
 * Get human-readable scope description
 * @param {number} locChanged
 * @returns {string}
 */
export function getScopeDescription(locChanged) {
  const scope = estimateScope(locChanged);

  const descriptions = {
    small: `${locChanged} LOC - quick review`,
    medium: `${locChanged} LOC - moderate review`,
    large: `${locChanged} LOC - substantial review (background recommended)`,
    xlarge: `${locChanged} LOC - very large review (consider moonshot-v1-32k model)`
  };

  return descriptions[scope];
}

/**
 * Recommend execution mode based on scope
 * @param {number} locChanged
 * @param {boolean} userSpecifiedWait - User explicitly requested --wait
 * @returns {'foreground'|'background'}
 */
export function recommendMode(locChanged, userSpecifiedWait = false) {
  if (userSpecifiedWait) return 'foreground';
  return locChanged >= 500 ? 'background' : 'foreground';
}

/**
 * Recommend model based on diff size
 * @param {number} locChanged
 * @returns {string}
 */
export function recommendModel(locChanged) {
  if (locChanged < 2000) return 'moonshot-v1-8k';
  return 'moonshot-v1-32k';
}

/**
 * Check if diff exceeds safe limits for a given model
 * @param {number} locChanged
 * @param {string} model
 * @returns {boolean}
 */
export function exceedsSafeLimit(locChanged, model) {
  const limits = {
    'moonshot-v1-8k': 3000,    // Conservative limit for 8k context
    'moonshot-v1-32k': 10000,  // Conservative limit for 32k context
    'moonshot-v1-128k': 40000  // Conservative limit for 128k context
  };

  const limit = limits[model] || limits['moonshot-v1-8k'];
  return locChanged > limit;
}
