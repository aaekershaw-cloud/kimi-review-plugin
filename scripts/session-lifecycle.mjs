#!/usr/bin/env node

/**
 * Session lifecycle hooks for Kimi review plugin
 */

const [event] = process.argv.slice(2);

if (event === 'SessionStart') {
  // Plugin initialization on session start
  // Currently no-op, but could validate Kimi CLI availability
  process.exit(0);
}

if (event === 'SessionEnd') {
  // Cleanup on session end
  // Could cancel running jobs or clean up old job data
  process.exit(0);
}

// Unknown event
process.exit(0);
