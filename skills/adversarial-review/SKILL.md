---
name: adversarial-review
description: Challenge-focused code review that questions design decisions and surfaces hidden assumptions. Includes confidence scores per finding. Best for security-sensitive code and major refactors.
user-invocable: true
allowed-tools:
  - Bash(*)
---

# /kimi-review:adversarial-review — Challenge-Focused Review

Adversarial review that questions design decisions and examines attack surfaces:
- Authentication/authorization edge cases
- Data integrity and race conditions
- Null safety and error handling
- Version compatibility and rollback safety
- Boundary conditions

Each finding includes a **confidence score** (0.0-1.0):
- 0.9-1.0: Very confident this is an issue
- 0.7-0.89: Likely an issue, needs verification
- 0.5-0.69: Potential issue worth investigating
- <0.5: Speculative, may be false positive

## Usage

```
/kimi-review:adversarial-review [options]
```

**Options:** Same as `/kimi-review:review`

## Execution

Arguments passed: `$ARGUMENTS`

Execute the adversarial review:
```bash
node ~/Projects/kimi-review-plugin/scripts/kimi-companion.mjs adversarial-review $ARGUMENTS
```

## When to Use

- Security-sensitive code (auth, payments, data access)
- Major refactors with architectural changes
- Reviewing unfamiliar code
- Before production deployment
- When you want to challenge assumptions

## Output

Same structure as standard review, plus confidence scores per finding.

**Present the output verbatim** - do not filter or adjust confidence scores.
