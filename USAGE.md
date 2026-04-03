# Kimi Review Plugin - Usage Guide

## Command Reference

### `/kimi:review` - Standard Code Review

Performs comprehensive code review analyzing correctness, security, performance, maintainability, and test coverage.

**Syntax:**
```
/kimi:review [--wait|--background] [--staged] [--branch <name>] [--base <ref>] [--model <model>]
```

**Options:**
- `--wait` - Force foreground execution (wait for results immediately)
- `--background` - Force background execution (get job ID, retrieve results later)
- `--staged` - Review only staged changes (`git diff --cached`)
- `--branch <name>` - Compare against specified branch
- `--base <ref>` - Compare against custom git reference
- `--model <model>` - Specify Kimi model (default: moonshot-v1-8k)

**Examples:**

Review uncommitted changes:
```
/kimi:review
```

Review staged changes before commit:
```
/kimi:review --staged
```

Compare feature branch against main:
```
/kimi:review --branch main
```

Force foreground for quick feedback:
```
/kimi:review --wait
```

Use larger model for big diff:
```
/kimi:review --model moonshot-v1-32k
```

---

### `/kimi:adversarial-review` - Challenge-Focused Review

Questions design decisions, surfaces hidden assumptions, examines attack surfaces.

**Syntax:**
```
/kimi:adversarial-review [same options as /kimi:review]
```

**Focus Areas:**
- Authentication/authorization edge cases
- Data integrity and consistency
- Race conditions and concurrency issues
- Null safety and error handling
- Version compatibility and rollback safety
- Boundary conditions and edge cases

**Confidence Scores:**
Each finding includes a confidence score (0.0-1.0):
- 0.9-1.0: Very confident this is an issue
- 0.7-0.89: Likely an issue, needs verification
- 0.5-0.69: Potential issue worth investigating
- <0.5: Speculative, may be false positive

**Example:**
```
/kimi:adversarial-review --branch main

## Review Result: NEEDS-ATTENTION

Authentication refactor introduces new session timing assumptions.

### Findings (2)

**[HIGH]** (confidence: 0.85) Session invalidation timing issue
  File: src/auth/session.js:78-92
  ...
```

---

### `/kimi:status` - Job Progress Tracking

Check status of background review jobs.

**Syntax:**
```
/kimi:status [job-id]
```

**Without job-id:** Lists all jobs in current repository

**With job-id:** Shows detailed status for specific job

**Example:**

List all jobs:
```
/kimi:status

## Jobs

Job ID                | Kind              | Status    | Phase           | Elapsed
----------------------|-------------------|-----------|-----------------|----------
kimi-review-a1b2c3d4 | review            | running   | Analyzing code  | 1m 23s
kimi-review-b2c3d4e5 | adversarial-rev   | completed | Complete        | 2m 45s
```

Check specific job:
```
/kimi:status kimi-review-a1b2c3d4

## Job Status

ID:       kimi-review-a1b2c3d4
Kind:     review
Status:   running
Phase:    Analyzing code
Started:  2026-04-03T10:30:00Z
Elapsed:  1m 23s
```

---

### `/kimi:result` - Retrieve Completed Results

Get findings from completed background job.

**Syntax:**
```
/kimi:result <job-id>
```

**Example:**
```
/kimi:result kimi-review-a1b2c3d4

## Review Result: NEEDS-ATTENTION

Refactor introduces several maintainability concerns.

### Findings (3)

**[HIGH]** Potential race condition in cache update
  File: src/cache/redis.js:142-158
  ...
```

**Error Cases:**

Job not found:
```
Job not found: kimi-review-invalid
```

Job still running:
```
Job kimi-review-a1b2c3d4 is still running
Check status: /kimi:status kimi-review-a1b2c3d4
```

Job failed:
```
Job kimi-review-a1b2c3d4 failed: Kimi CLI timed out after 600 seconds
```

---

### `/kimi:cancel` - Stop Running Job

Terminate a background review job.

**Syntax:**
```
/kimi:cancel <job-id>
```

**Example:**
```
/kimi:cancel kimi-review-a1b2c3d4

Job kimi-review-a1b2c3d4 cancelled
```

**Note:** Can only cancel jobs with status `running`. Completed or failed jobs cannot be cancelled.

---

## Execution Modes

### Foreground Mode

- Waits for review to complete before returning
- Shows progress dots during execution
- Returns findings immediately
- Best for diffs <500 LOC

**Trigger:**
- Automatic for diffs <500 LOC
- Explicit with `--wait` flag

### Background Mode

- Spawns detached worker process
- Returns job ID immediately
- Check progress with `/kimi:status`
- Retrieve results with `/kimi:result`
- Best for diffs >500 LOC

**Trigger:**
- Automatic for diffs ≥500 LOC
- Explicit with `--background` flag

---

## Model Selection

### Available Models

| Model | Context Window | Best For |
|-------|----------------|----------|
| moonshot-v1-8k | 8,192 tokens | Small to medium diffs (<2000 LOC) |
| moonshot-v1-32k | 32,768 tokens | Large diffs (2000-5000 LOC) |
| moonshot-v1-128k | 128,000 tokens | Very large diffs (>5000 LOC) |

### Auto-Recommendation

The plugin auto-recommends models based on diff size:

```
$ /kimi:review

Diff scope: 3,247 LOC - very large review (consider moonshot-v1-32k model)

Warning: Diff size (3,247 LOC) may exceed safe limits for moonshot-v1-8k
Recommended model: moonshot-v1-32k
```

Override with `--model` flag:
```
/kimi:review --model moonshot-v1-32k
```

---

## Output Format

All reviews return structured JSON with consistent schema.

### Standard Review

```json
{
  "verdict": "approve",
  "summary": "Code changes look solid with minor concerns.",
  "findings": [
    {
      "severity": "medium",
      "title": "Duplicated validation logic",
      "body": "The email validation is duplicated in both UserController and ProfileController. Consider extracting to a shared validator.",
      "file": "src/controllers/UserController.js",
      "line_start": 45,
      "line_end": 52,
      "recommendation": "Create src/validators/email.js and import in both controllers"
    }
  ],
  "next_steps": [
    "Extract shared validation logic",
    "Add tests for edge cases"
  ]
}
```

### Adversarial Review

Includes `confidence` scores:

```json
{
  "verdict": "needs-attention",
  "summary": "Several potential race conditions identified.",
  "findings": [
    {
      "severity": "high",
      "confidence": 0.85,
      "title": "Race condition in cache invalidation",
      "body": "...",
      "file": "src/cache/manager.js",
      "line_start": 78,
      "line_end": 92,
      "recommendation": "Use Redis WATCH/MULTI for atomic cache updates"
    }
  ],
  "next_steps": [
    "Add locking mechanism for cache updates",
    "Test concurrent access scenarios"
  ]
}
```

---

## Severity Definitions

### Critical
**Blocks merge** - Must fix immediately

Examples:
- SQL injection vulnerabilities
- Authentication bypasses
- Data loss scenarios
- System crashes

### High
**Should fix before merge** - Significant impact

Examples:
- Logic errors affecting correctness
- Performance bottlenecks (N+1 queries)
- Memory leaks
- Unhandled error cases

### Medium
**Should address soon** - Maintainability concerns

Examples:
- Code duplication
- Complex logic that's hard to understand
- Missing documentation for non-obvious code
- Tech debt accumulation

### Low
**Nice-to-have** - Minor improvements

Examples:
- Variable naming improvements
- Code organization suggestions
- Non-critical optimizations
- Style consistency (when impacting readability)

---

## Workflow Examples

### Pre-Commit Review

```bash
# Make changes
git add .

# Review staged changes
/kimi:review --staged

# If approved, commit
git commit -m "Add user authentication"
```

### Pull Request Review

```bash
# Switch to feature branch
git checkout feature/new-dashboard

# Review against main
/kimi:adversarial-review --branch main

# Address findings, push PR
```

### Large Refactor

```bash
# Start background review
/kimi:review --background
# Job started: kimi-review-a1b2c3d4

# Continue working...
# (check status periodically)
/kimi:status kimi-review-a1b2c3d4

# Get results when complete
/kimi:result kimi-review-a1b2c3d4
```

### Security Audit

```bash
# Use adversarial review for security focus
/kimi:adversarial-review --branch production

# Review findings sorted by severity+confidence
# Address critical and high-confidence findings first
```

---

## Tips & Best Practices

### When to Use Standard Review

- General purpose code changes
- Pre-commit checks
- Catching obvious bugs and issues
- Quick feedback during development

### When to Use Adversarial Review

- Security-sensitive code (auth, payments, data access)
- Major refactors with architectural changes
- Reviewing someone else's code
- Before deploying to production
- When you want to challenge your assumptions

### Managing Large Diffs

For diffs >5000 LOC:

1. **Break into smaller reviews:**
   ```
   /kimi:review src/controllers --staged
   /kimi:review src/services --staged
   ```

2. **Use larger model:**
   ```
   /kimi:review --model moonshot-v1-128k
   ```

3. **Run in background:**
   ```
   /kimi:review --background
   ```

### Interpreting Confidence Scores

In adversarial reviews:
- **High confidence (>0.8):** Investigate immediately, likely a real issue
- **Medium confidence (0.6-0.8):** Worth looking at, may need context
- **Low confidence (<0.6):** Consider if it applies to your use case

---

## Troubleshooting

### "Not a git repository"

```
Error: Not a git repository
```

**Solution:** Plugin must be run from within a git repository. Run `git init` if needed.

### "No changes to review"

```
No changes to review. Working tree is clean.

To review staged changes: /kimi:review --staged
To review a branch: /kimi:review --branch feature-name
```

**Solution:** Make changes, or use `--staged`/`--branch` flags to compare against specific refs.

### Timeout Issues

```
Kimi review timed out after 5 minutes.
```

**Solutions:**
- Use `--background` for long reviews (10min timeout)
- Break diff into smaller chunks
- Increase timeout in config (see Configuration section)

### Malformed Output

```
Error: Could not parse structured review output from Kimi.

Raw output saved to: ~/.kimi-review/jobs/<job-id>/raw-output.txt
```

**Solution:** Check raw output file. May indicate:
- Kimi model returning prose instead of JSON
- Network issues during streaming
- Prompt engineering problem

Report as bug with raw output attached.

---

## Configuration

### User Config File

Create `~/.kimi-review/config.json`:

```json
{
  "model": "moonshot-v1-8k",
  "timeout_seconds": 300,
  "auto_background_threshold_loc": 500
}
```

**Options:**
- `model` - Default model for all reviews
- `timeout_seconds` - Foreground job timeout (default: 300)
- `auto_background_threshold_loc` - LOC threshold for auto-background (default: 500)

### Per-Project Config

Create `.kimi-review.json` in repo root:

```json
{
  "model": "moonshot-v1-32k",
  "ignore_patterns": [
    "vendor/**",
    "node_modules/**",
    "*.min.js"
  ]
}
```

**Note:** Per-project config not yet implemented (planned for future release).

---

## Advanced Usage

### Custom Prompts

Coming soon: Support for custom prompt templates.

```yaml
# .kimi-review.yaml
prompts:
  security:
    template: prompts/security-review.md
    model: moonshot-v1-32k
```

### Watch Mode

Coming soon: Auto-run reviews on file changes.

```
/kimi:review --watch
```

### GitHub Actions Integration

Example workflow:

```yaml
name: Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Kimi Review
        run: |
          npm install -g @andrewkershaw/kimi-review
          kimi-review --branch ${{ github.base_ref }}
```

---

## Support

- **Issues:** Report bugs or feature requests at [GitHub Issues]
- **Discussions:** Ask questions in [GitHub Discussions]
- **Docs:** Full documentation at [README.md](README.md)
