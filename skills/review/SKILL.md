---
name: review
description: Run code review using Kimi CLI on uncommitted changes. Analyzes correctness, security, performance, maintainability, and test coverage. Returns structured findings with file paths and line numbers.
user-invocable: true
allowed-tools:
  - Bash(*)
---

# /kimi-review:review — Standard Code Review

Run Kimi code review on git changes. Analyzes:
- Correctness (logic errors, edge cases)
- Security (injection vulnerabilities, auth issues)
- Performance (N+1 queries, memory leaks)
- Maintainability (code clarity, duplication)
- Testing (missing coverage)

## Usage

```
/kimi-review:review [options]
```

**Options:**
- `--wait` - Force foreground execution (immediate results)
- `--background` - Force background execution (get job ID)
- `--staged` - Review only staged changes
- `--branch <name>` - Compare against branch
- `--base <ref>` - Compare against custom git ref
- `--model <model>` - Specify Kimi model (default: moonshot-v1-8k)

## Execution

Arguments passed: `$ARGUMENTS`

Execute the review:
```bash
node ~/Projects/kimi-review-plugin/scripts/kimi-companion.mjs review $ARGUMENTS
```

**Important:** The script handles all git operations, Kimi CLI invocation, output parsing, and result presentation. Do not modify or interpret its output.

## Output

The script returns structured findings with:
- Verdict (approve / needs-attention)
- Summary of changes
- Findings sorted by severity (critical → low)
- Each finding includes file path, line numbers, and recommendations
- Next steps for the developer

**Present the output verbatim** - do not paraphrase or add commentary.

## Mode Selection

- <500 LOC: Foreground (immediate)
- ≥500 LOC: Background (returns job ID)
- Override with `--wait` or `--background`

For background jobs:
- Returns job ID
- Check progress: `/kimi-review:status <job-id>`
- Get results: `/kimi-review:result <job-id>`
