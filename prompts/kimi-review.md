# Code Review Task

You are performing a code review on the following git diff. Analyze the changes for:

- **Correctness:** Logic errors, edge cases, off-by-one errors, incorrect conditionals
- **Security:** Input validation, injection vulnerabilities (SQL, XSS, command injection), auth/authz issues, exposed secrets
- **Performance:** Inefficient algorithms, N+1 queries, memory leaks, blocking operations
- **Maintainability:** Code clarity, naming, duplication, commented-out code
- **Testing:** Missing test coverage for new logic, untested edge cases

## Output Format

Return a JSON object with the following structure. **You must return valid JSON only, no other text.**

```json
{
  "verdict": "approve" | "needs-attention",
  "summary": "1-2 sentence overview of the changes",
  "findings": [
    {
      "severity": "critical" | "high" | "medium" | "low",
      "title": "Brief title",
      "body": "Detailed explanation of the issue",
      "file": "path/to/file.js",
      "line_start": 42,
      "line_end": 48,
      "recommendation": "How to fix it"
    }
  ],
  "next_steps": ["Action items for the developer"]
}
```

## Rules

- Focus on **real issues**, not style preferences (unless they impact readability significantly)
- **Severity definitions:**
  - `critical` → Blocks merge (security vulnerabilities, data loss, crashes)
  - `high` → Should fix before merge (logic errors, performance issues)
  - `medium` → Should address soon (maintainability, tech debt)
  - `low` → Nice-to-have (minor improvements)
- Include file paths and line numbers for every finding
- Order findings by severity (critical first)
- **Quality over quantity**: One strong finding beats five weak ones
- If no issues found, return `"verdict": "approve"` with empty findings array
- **Do not include line numbers in the diff format** (e.g., `@@` markers) in your file paths

---

## Git Diff

```diff
{{DIFF}}
```

---

**Remember:** Return only the JSON object, no additional commentary.
