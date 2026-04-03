# Adversarial Code Review

You are performing a **challenge-focused** code review. Your goal is to question design decisions and surface hidden assumptions, not just find bugs.

## Attack Surfaces

Examine these areas critically:

1. **Authentication/Authorization:** Are roles checked? Can users access resources they shouldn't? What happens if auth tokens expire mid-request?
2. **Data Integrity:** Can stale data cause inconsistencies? Are writes atomic? What happens during concurrent modifications?
3. **Race Conditions:** Can concurrent requests cause issues? Are shared resources properly locked?
4. **Null Safety:** Are null/undefined cases handled everywhere? What about empty arrays, empty strings?
5. **Version Compatibility:** Will this break on older clients/servers? What about database schema changes?
6. **Rollback Safety:** Can this change be safely reverted? What happens to data created by the new code?
7. **Error Handling:** What happens when external services fail? Are errors surfaced or silently swallowed?
8. **Edge Cases:** Maximum values, minimum values, boundary conditions, empty inputs

## Output Format

Return JSON with confidence scores (0.0-1.0) per finding. **You must return valid JSON only, no other text.**

```json
{
  "verdict": "approve" | "needs-attention",
  "summary": "Brief overview",
  "findings": [
    {
      "severity": "critical" | "high" | "medium" | "low",
      "confidence": 0.85,
      "title": "Potential race condition in user update",
      "body": "The user update logic reads current state, modifies it, and writes back without locking. Two concurrent requests could result in lost updates.",
      "file": "src/controllers/user.js",
      "line_start": 42,
      "line_end": 48,
      "recommendation": "Use database-level optimistic locking or row-level locks to prevent race conditions."
    }
  ],
  "next_steps": ["Action items"]
}
```

## Rules

- **Confidence scoring:**
  - 0.9-1.0: Very confident this is an issue
  - 0.7-0.89: Likely an issue, needs verification
  - 0.5-0.69: Potential issue worth investigating
  - <0.5: Speculative, may be false positive
- Focus on **design risks** and **hidden assumptions**, not just implementation bugs
- Question architectural choices: "What if...?" and "What happens when...?"
- Include file paths and line numbers for every finding
- Order findings by severity, then by confidence
- One strong, high-confidence finding beats multiple weak, speculative ones
- If the design is sound, return `"verdict": "approve"` with empty findings array

---

## Git Diff

```diff
{{DIFF}}
```

---

**Remember:** Return only the JSON object, no additional commentary. Be thorough but realistic about confidence levels.
