/**
 * Parse NDJSON output from Kimi CLI into structured findings
 */

/**
 * Parse Kimi NDJSON stream into text blocks
 * @param {string} ndjsonOutput - Raw NDJSON output from Kimi
 * @returns {string} Combined text output
 */
export function parseKimiStream(ndjsonOutput) {
  const lines = ndjsonOutput.split('\n').filter(line => line.trim());
  const textBlocks = [];

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);

      // Extract text from assistant messages
      if (obj.role === 'assistant') {
        const content = obj.content || [];
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            textBlocks.push(block.text);
          }
        }
      }
    } catch (err) {
      // Skip non-JSON lines
      continue;
    }
  }

  return textBlocks.join('');
}

/**
 * Extract structured JSON from Kimi output
 * @param {string} fullOutput - Complete text output from Kimi
 * @returns {Object} Parsed JSON review object
 * @throws {Error} If JSON cannot be extracted
 */
export function extractStructuredOutput(fullOutput) {
  // Try to find JSON in markdown code block first
  const codeBlockMatch = fullOutput.match(/```json\n([\s\S]+?)\n```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch (err) {
      // Fall through to next attempt
    }
  }

  // Try to find raw JSON object
  const jsonMatch = fullOutput.match(/\{[\s\S]+\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      // Fall through to error
    }
  }

  throw new Error('Could not parse structured review output from Kimi');
}

/**
 * Validate review output schema
 * @param {Object} output - Parsed output object
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
export function validateReviewOutput(output) {
  if (!output.verdict || !['approve', 'needs-attention'].includes(output.verdict)) {
    throw new Error('Invalid or missing verdict (must be "approve" or "needs-attention")');
  }

  if (!output.summary || typeof output.summary !== 'string') {
    throw new Error('Invalid or missing summary');
  }

  if (!Array.isArray(output.findings)) {
    throw new Error('Invalid or missing findings array');
  }

  // Validate each finding
  for (const finding of output.findings) {
    if (!finding.severity || !['critical', 'high', 'medium', 'low'].includes(finding.severity)) {
      throw new Error(`Invalid severity in finding: ${finding.severity}`);
    }

    if (!finding.title || typeof finding.title !== 'string') {
      throw new Error('Finding missing title');
    }

    if (!finding.file || typeof finding.file !== 'string') {
      throw new Error('Finding missing file path');
    }
  }

  if (!Array.isArray(output.next_steps)) {
    throw new Error('Invalid or missing next_steps array');
  }

  return true;
}

/**
 * Sort findings by severity (critical first)
 * @param {Array} findings
 * @returns {Array} Sorted findings
 */
export function sortBySeverity(findings) {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  return findings.sort((a, b) => {
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Parse and validate complete review output
 * @param {string} ndjsonOutput - Raw NDJSON from Kimi
 * @returns {Object} Validated and sorted review output
 */
export function parseReviewOutput(ndjsonOutput) {
  const textOutput = parseKimiStream(ndjsonOutput);
  const structured = extractStructuredOutput(textOutput);
  validateReviewOutput(structured);

  // Sort findings by severity
  structured.findings = sortBySeverity(structured.findings);

  return structured;
}
