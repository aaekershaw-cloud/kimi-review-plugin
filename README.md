# Kimi Review Plugin for Claude Code

Code review integration for Claude Code using Kimi CLI. Get structured, actionable code reviews with file-level findings and severity ratings.

## Features

- **Standard Code Review** (`/kimi:review`) - Correctness, security, performance, maintainability
- **Adversarial Review** (`/kimi:adversarial-review`) - Challenge assumptions, question design decisions
- **Background Jobs** - Large diffs run in background with progress tracking
- **Structured Output** - JSON findings with file paths, line numbers, and recommendations
- **Model Selection** - Auto-recommend appropriate Kimi model based on diff size

## Requirements

- **Node.js** 18.18 or later
- **Kimi CLI** - Must be installed and available in PATH
- **Git** - For diff extraction
- **Claude Code** - Plugin system support

## Installation

### 1. Install Kimi CLI

```bash
npm install -g @moonshot-ai/kimi-cli
# or
curl -sSL https://moonshot.cn/install.sh | sh

# Verify installation
kimi --version
```

### 2. Install Plugin

```bash
cd ~/Projects
git clone <this-repo> kimi-review-plugin
cd kimi-review-plugin
npm install
npm link  # Makes plugin globally available
```

### 3. Register with Claude Code

```bash
# If Claude Code supports plugin auto-discovery:
# Plugin should appear in /skills list automatically

# Manual registration (if needed):
claude code --install-plugin @andrewkershaw/kimi-review
```

## Usage

### Standard Code Review

Review uncommitted changes:
```
/kimi:review
```

Review only staged changes:
```
/kimi:review --staged
```

Review against a branch:
```
/kimi:review --branch main
```

Force foreground execution (default for <500 LOC):
```
/kimi:review --wait
```

Force background execution:
```
/kimi:review --background
```

Use larger model for big diffs:
```
/kimi:review --model moonshot-v1-32k
```

### Adversarial Review

Challenge design decisions and assumptions:
```
/kimi:adversarial-review
```

All options from `/kimi:review` are supported.

### Background Job Management

Check all jobs in current repo:
```
/kimi:status
```

Check specific job:
```
/kimi:status kimi-review-a1b2c3d4
```

Get results from completed job:
```
/kimi:result kimi-review-a1b2c3d4
```

Cancel running job:
```
/kimi:cancel kimi-review-a1b2c3d4
```

## Output Format

Reviews return structured JSON with:

```json
{
  "verdict": "approve" | "needs-attention",
  "summary": "Brief overview of changes",
  "findings": [
    {
      "severity": "critical|high|medium|low",
      "title": "Finding title",
      "body": "Detailed explanation",
      "file": "path/to/file.js",
      "line_start": 42,
      "line_end": 48,
      "recommendation": "How to fix",
      "confidence": 0.85  // Adversarial review only
    }
  ],
  "next_steps": ["Action items"]
}
```

### Severity Levels

- **Critical** - Blocks merge (security vulnerabilities, data loss, crashes)
- **High** - Should fix before merge (logic errors, performance issues)
- **Medium** - Should address soon (maintainability, tech debt)
- **Low** - Nice-to-have (minor improvements)

## Configuration

### Model Selection

Models are auto-recommended based on diff size:

| Diff Size | Recommended Model | Context Window |
|-----------|-------------------|----------------|
| <2000 LOC | moonshot-v1-8k | 8,192 tokens |
| 2000-5000 LOC | moonshot-v1-32k | 32,768 tokens |
| >5000 LOC | moonshot-v1-128k | 128,000 tokens |

### User Config

Create `~/.kimi-review/config.json`:

```json
{
  "model": "moonshot-v1-8k",
  "timeout_seconds": 300,
  "auto_background_threshold_loc": 500
}
```

### Job Storage

Job state is stored in `~/.kimi-review/jobs/<repo_hash>/<job_id>/`:
- `status.json` - Job status and metadata
- `result.json` - Review findings (when complete)
- `raw-output.txt` - Raw Kimi output (on parse errors)

## Examples

### Small Feature Review

```
$ /kimi:review
Diff scope: 47 LOC - quick review

Running review review...
.....

## Review Result: APPROVE

Added user authentication middleware. Logic looks solid.

### Findings (1)

**[MEDIUM]** Missing test coverage
  File: src/middleware/auth.js:12-25
  The new auth middleware lacks unit tests for error cases (invalid tokens, expired tokens)
  → Add tests for token validation edge cases
```

### Large Refactor (Background)

```
$ /kimi:review
Diff scope: 1,247 LOC - substantial review (background recommended)

Large diff detected. Running in background...

Job started: kimi-review-a1b2c3d4
Check status: /kimi:status kimi-review-a1b2c3d4
Get results: /kimi:result kimi-review-a1b2c3d4

$ /kimi:status kimi-review-a1b2c3d4

## Job Status

ID:       kimi-review-a1b2c3d4
Kind:     review
Status:   running
Phase:    Analyzing code
Started:  2026-04-03T10:30:00Z
Elapsed:  1m 23s

$ /kimi:result kimi-review-a1b2c3d4

## Review Result: NEEDS-ATTENTION

Major refactor of payment processing. Several concerns identified.

### Findings (3)

**[CRITICAL]** Potential race condition in payment processing
  File: src/services/payment.js:142-158
  ...
```

### Adversarial Review

```
$ /kimi:adversarial-review
Diff scope: 312 LOC - moderate review

Running adversarial-review review...
.....

## Review Result: NEEDS-ATTENTION

Authentication refactor introduces new assumptions about session handling.

### Findings (2)

**[HIGH]** (confidence: 0.85) Session invalidation timing issue
  File: src/auth/session.js:78-92
  The new session cleanup runs every 5 minutes, but sessions expire after 15 minutes.
  If a user's session expires at T+14:59 and cleanup runs at T+15:00, there's a 1-second
  window where an expired session is still valid.
  → Use lazy expiration checks on session access instead of periodic cleanup
```

## Troubleshooting

### Kimi CLI Not Found

```
Error: Kimi CLI not found in PATH.

Install Kimi:
  npm install -g @moonshot-ai/kimi-cli
  # or
  curl -sSL https://moonshot.cn/install.sh | sh

Then verify: kimi --version
```

**Solution:** Install Kimi CLI and ensure it's in your PATH or at `~/.local/bin/kimi`

### Diff Too Large

```
Warning: Diff size (5,247 LOC) may exceed safe limits for moonshot-v1-8k
Recommended model: moonshot-v1-32k
```

**Solution:** Use `--model moonshot-v1-32k` or break review into smaller batches

### Malformed Output

```
Error: Could not parse structured review output from Kimi.

Raw output saved to: ~/.kimi-review/jobs/<job-id>/raw-output.txt
```

**Solution:** Check raw output file, may indicate prompt engineering issue. Report as bug.

### Job Timeout

```
Kimi review timed out after 5 minutes.
```

**Solution:**
- Review in smaller batches
- Increase timeout (background jobs have 10min timeout)
- Check if Kimi CLI is hanging

## Architecture

### Data Flow

```
User invokes /kimi:review
  ↓
kimi-companion.mjs (command router)
  ↓
git-diff.mjs (extract changes)
  ↓
scope-estimator.mjs (decide foreground vs background)
  ↓
kimi-cli-wrapper.mjs (spawn subprocess)
  ↓
kimi --print --yolo -p "<prompt>" --output-format stream-json
  ↓
output-parser.mjs (NDJSON → JSON)
  ↓
job-store.mjs (persist results)
  ↓
Present findings to user
```

### File Structure

```
kimi-review-plugin/
├── package.json              # Plugin metadata
├── hooks.json                # Session lifecycle hooks
├── scripts/
│   ├── kimi-companion.mjs   # Main command router
│   ├── job-manager.mjs      # Background job lifecycle
│   ├── review-worker.mjs    # Background job executor
│   └── session-lifecycle.mjs # Hook handlers
├── prompts/
│   ├── kimi-review.md       # Standard review prompt
│   └── kimi-adversarial-review.md
├── lib/
│   ├── git-diff.mjs         # Git operations
│   ├── scope-estimator.mjs  # LOC counting, mode selection
│   ├── output-parser.mjs    # NDJSON → structured findings
│   ├── kimi-cli-wrapper.mjs # Subprocess spawning
│   └── job-store.mjs        # Filesystem state persistence
└── skills/
    └── kimi-result-handling.md # Output presentation guidance
```

## Development

### Running Tests

```bash
npm test
```

### Debugging

Set `DEBUG=kimi-review:*` to enable verbose logging:

```bash
DEBUG=kimi-review:* /kimi:review
```

### Testing Prompts

Test prompt templates directly:

```bash
git diff > /tmp/test.diff
kimi --print --yolo -p "$(cat prompts/kimi-review.md | sed "s/{{DIFF}}/$(cat /tmp/test.diff)/")" --output-format stream-json
```

## Contributing

Contributions welcome! Areas for improvement:

- [ ] Add unit tests for all modules
- [ ] Support custom prompt templates (`.kimi-review.yaml`)
- [ ] Watch mode (`--watch` flag to re-run on file changes)
- [ ] GitHub Action integration
- [ ] VS Code extension
- [ ] Multi-model routing (route by file type or finding category)

## License

MIT

## Credits

- Inspired by [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc)
- Built for use with [Claude Code](https://claude.ai/code)
- Powered by [Kimi (Moonshot AI)](https://moonshot.cn/)
