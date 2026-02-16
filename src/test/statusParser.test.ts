import * as assert from 'assert';
import {
  containsOpenQuestionMarkers,
  containsPlaceholderTokens,
  extractAdjustments,
  isChecklistComplete,
  parseChecklist,
} from '../utils/statusParser';

suite('statusParser', () => {
  test('detects open question markers', () => {
    assert.strictEqual(containsOpenQuestionMarkers('TODO: add details'), true);
    assert.strictEqual(containsOpenQuestionMarkers('All good here.'), false);
    assert.strictEqual(
      containsOpenQuestionMarkers('No [NEEDS CLARIFICATION] markers remain'),
      false
    );
  });

  test('detects placeholder tokens', () => {
    assert.strictEqual(containsPlaceholderTokens('[FEATURE NAME]'), true);
    assert.strictEqual(containsPlaceholderTokens('[NEEDS CLARIFICATION: add detail]'), true);
    assert.strictEqual(containsPlaceholderTokens('Filled content.'), false);
  });

  test('parses checklist completion', () => {
    const checklist = '- [x] One\n- [ ] Two\n- [X] Three\n';
    const parsed = parseChecklist(checklist);
    assert.strictEqual(parsed.total, 3);
    assert.strictEqual(parsed.checked, 2);
    assert.strictEqual(isChecklistComplete(checklist), false);
    assert.strictEqual(isChecklistComplete('- [x] Done\n'), true);
  });

  test('extracts adjustments with line and column info', () => {
    const text = 'TODO: one\nSomething [FEATURE NAME]\nTBD and TKTK\n';
    const adjustments = extractAdjustments(text);

    assert.strictEqual(adjustments.length, 4);
    assert.deepStrictEqual(adjustments[0], { label: 'TODO', line: 1, column: 1 });
    assert.deepStrictEqual(adjustments[1], { label: '[FEATURE NAME]', line: 2, column: 11 });
    assert.deepStrictEqual(adjustments[2], { label: 'TBD', line: 3, column: 1 });
    assert.deepStrictEqual(adjustments[3], { label: 'TKTK', line: 3, column: 9 });
  });
});
