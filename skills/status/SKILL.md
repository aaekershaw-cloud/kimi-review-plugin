---
name: status
description: Check status of background review jobs. Without job ID, lists all jobs. With job ID, shows detailed progress for that specific job.
user-invocable: true
allowed-tools:
  - Bash(*)
---

# /kimi-review:status — Job Progress Tracking

Check progress of background review jobs.

## Usage

List all jobs:
```
/kimi-review:status
```

Check specific job:
```
/kimi-review:status <job-id>
```

## Execution

Arguments passed: `$ARGUMENTS`

```bash
node ~/Projects/kimi-review-plugin/scripts/kimi-companion.mjs status $ARGUMENTS
```

## Output

Without job-id: Table of all jobs (ID, kind, status, phase, elapsed)

With job-id: Detailed status including:
- Job ID and kind (review / adversarial-review)
- Status (pending / running / completed / failed / cancelled)
- Current phase
- Started time and elapsed/duration
- Error message (if failed)

**Present the output verbatim.**
