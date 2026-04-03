---
name: result
description: Retrieve findings from a completed background job. Returns structured review output with verdict, findings, and recommendations.
user-invocable: true
allowed-tools:
  - Bash(*)
---

# /kimi-review:result — Retrieve Job Results

Get review findings from a completed background job.

## Usage

```
/kimi-review:result <job-id>
```

**Job ID required** - obtained from background review invocation.

## Execution

Arguments passed: `$ARGUMENTS`

```bash
node ~/Projects/kimi-review-plugin/scripts/kimi-companion.mjs result $ARGUMENTS
```

## Output

Complete review findings:
- Verdict (approve / needs-attention)
- Summary of changes
- Findings sorted by severity
- Each finding: severity, title, body, file path, line numbers, recommendation
- Confidence scores (adversarial review only)
- Next steps

## Error Cases

- Job not found: Invalid job ID
- Job still running: Check `/kimi-review:status <job-id>`
- Job failed: Shows error message

## Critical Rule

**After presenting findings, STOP IMMEDIATELY.**

Do not:
- Suggest fixes unless user explicitly asks
- Offer to implement recommendations
- Auto-apply any changes
- Make assumptions about what the user wants to do next

Wait for explicit user approval before taking any action.

**Present the output verbatim** - do not paraphrase or add commentary.
