# Kimi Result Handling Guidance

When presenting code review results from Kimi, follow these principles:

## Output Fidelity

- **Present findings verbatim** - Do not paraphrase, summarize, or editorialize Kimi's output
- Preserve the verdict, summary, findings structure exactly as returned
- Do not add your own commentary or opinions about the findings

## Severity Ordering

- Findings are already sorted by severity (critical → high → medium → low)
- Present them in this order without reordering
- Do not filter findings based on perceived importance

## File References

- Every finding includes file path and line numbers
- Present these in a format that allows easy navigation: `file.js:42-48`
- Do not strip or modify file paths

## Critical Rule: Stop After Presenting

**After presenting Kimi's findings, STOP IMMEDIATELY.**

Do not:
- Suggest fixes unless the user explicitly asks
- Offer to implement recommendations
- Auto-apply any changes
- Make assumptions about what the user wants to do next

Wait for explicit user approval before taking any action.

## Error Handling

If Kimi returns an error or malformed output:
- Report the error honestly
- Do not improvise or guess what the review should have said
- Suggest checking `/kimi:status <job-id>` for more details
- Do not retry automatically

## Result Presentation Format

Use this structure:

```
## Review Result: APPROVE / NEEDS-ATTENTION

[Summary from Kimi]

### Findings (N)

**[SEVERITY]** Title
  File: path/to/file.js:42-48
  [Body text]
  → [Recommendation]

### Next Steps

- [Action items from Kimi]
```

## Quality Guarantees

Kimi reviews guarantee:
- Real issues, not style preferences (unless specified)
- File paths and line numbers for every finding
- Actionable recommendations
- Severity levels based on merge impact

Do not second-guess Kimi's severity assessments.
