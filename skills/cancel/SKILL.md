---
name: cancel
description: Terminate a running background review job. Can only cancel jobs with status 'running'.
user-invocable: true
allowed-tools:
  - Bash(*)
---

# /kimi-review:cancel — Stop Running Job

Terminate a background review job.

## Usage

```
/kimi-review:cancel <job-id>
```

**Job ID required** - obtained from background review invocation.

## Execution

Arguments passed: `$ARGUMENTS`

```bash
node ~/Projects/kimi-review-plugin/scripts/kimi-companion.mjs cancel $ARGUMENTS
```

## Behavior

- Sends SIGTERM to Kimi subprocess
- Updates job status to 'cancelled'
- Cleans up job state

## Limitations

- Can only cancel jobs with status `running`
- Completed or failed jobs cannot be cancelled
- Job state is preserved in `~/.kimi-review/jobs/` after cancellation

## Output

Success: "Job <job-id> cancelled"

Failure: "Could not cancel job <job-id> (not running or not found)"

**Present the output verbatim.**
