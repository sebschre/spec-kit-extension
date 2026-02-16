import { ChecklistStatus, TaskProgress } from '../models/statusModels';

const ADJUSTMENT_MARKERS = [
  { label: 'NEEDS CLARIFICATION', regex: /\bNEEDS CLARIFICATION\b/gi },
  { label: 'TODO', regex: /\bTODO\b/gi },
  { label: 'TBD', regex: /\bTBD\b/gi },
  { label: 'TKTK', regex: /\bTKTK\b/gi },
];

const PLACEHOLDER_TOKENS = [
  '[FEATURE NAME]',
  '[DATE]',
  '[###-feature-name]',
];

const NEEDS_CLARIFICATION_LINE = /\[NEEDS CLARIFICATION:/i;
const NEEDS_CLARIFICATION_EXCLUSION = /No \[NEEDS CLARIFICATION\] markers remain/i;

export function containsOpenQuestionMarkers(text: string): boolean {
  const lines = text.split(/\r?\n/);
  for (const lineText of lines) {
    if (NEEDS_CLARIFICATION_EXCLUSION.test(lineText)) {
      continue;
    }

    for (const marker of ADJUSTMENT_MARKERS) {
      marker.regex.lastIndex = 0;
      if (marker.regex.test(lineText)) {
        return true;
      }
    }
  }

  return false;
}

export function containsPlaceholderTokens(text: string): boolean {
  if (PLACEHOLDER_TOKENS.some((token) => text.includes(token))) {
    return true;
  }

  return NEEDS_CLARIFICATION_LINE.test(text);
}

export type AdjustmentMatch = {
  label: string;
  line: number;
  column: number;
};

export function extractAdjustments(text: string): AdjustmentMatch[] {
  const adjustments: AdjustmentMatch[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    const lineNumber = index + 1;

    for (const marker of ADJUSTMENT_MARKERS) {
      if (marker.label === 'NEEDS CLARIFICATION'
        && NEEDS_CLARIFICATION_EXCLUSION.test(lineText)) {
        continue;
      }
      marker.regex.lastIndex = 0;
      let match = marker.regex.exec(lineText);
      while (match) {
        adjustments.push({
          label: marker.label,
          line: lineNumber,
          column: match.index + 1,
        });
        match = marker.regex.exec(lineText);
      }
    }

    for (const token of PLACEHOLDER_TOKENS) {
      let startIndex = 0;
      let foundIndex = lineText.indexOf(token, startIndex);
      while (foundIndex !== -1) {
        adjustments.push({
          label: token,
          line: lineNumber,
          column: foundIndex + 1,
        });
        startIndex = foundIndex + token.length;
        foundIndex = lineText.indexOf(token, startIndex);
      }
    }
  });

  return adjustments;
}

export function parseChecklist(text: string): ChecklistStatus {
  const pattern = /- \[( |x|X)\]/g;
  let total = 0;
  let checked = 0;
  let match = pattern.exec(text);

  while (match) {
    total += 1;
    if (match[1].toLowerCase() === 'x') {
      checked += 1;
    }
    match = pattern.exec(text);
  }

  return { total, checked };
}

export function isChecklistComplete(text: string): boolean {
  const { total, checked } = parseChecklist(text);
  return total > 0 && total === checked;
}

export function parseTaskProgress(text: string): TaskProgress {
  const { total, checked } = parseChecklist(text);
  const ratio = total === 0 ? 0 : checked / total;
  const width = 10;
  const filled = Math.round(ratio * width);
  const bar = `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}]`;
  return {
    completed: checked,
    total,
    ratio,
    text: `Tasks ${checked}/${total}`,
    bar,
  };
}
