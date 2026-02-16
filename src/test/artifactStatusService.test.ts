import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  buildExpectedArtifacts,
  buildMemoryArtifacts,
  classifyArtifactStatus,
  hasNonWhitespaceContent,
} from '../services/artifactStatusService';

suite('artifactStatusService', () => {
  test('classifies artifact status from content and checklist', () => {
    assert.strictEqual(
      classifyArtifactStatus({ exists: false, kind: 'file' }),
      'missing'
    );
    assert.strictEqual(
      classifyArtifactStatus({ exists: true, kind: 'file', text: 'TODO: add details' }),
      'open-questions'
    );
    assert.strictEqual(
      classifyArtifactStatus({ exists: true, kind: 'file', text: 'Done', checklistComplete: true }),
      'validated'
    );
    assert.strictEqual(
      classifyArtifactStatus({ exists: true, kind: 'file', text: 'Done' }),
      'complete'
    );
  });

  test('builds artifacts from feature folder and memory', () => {
    const workspaceRoot = vscode.Uri.file('/tmp/workspace');
    const featureRoot = vscode.Uri.file('/tmp/workspace/specs/001-feature');
    const descriptors = buildExpectedArtifacts({ workspaceRoot, featureRoot });

    const constitution = descriptors.find((item) => item.id === 'constitution');
    const spec = descriptors.find((item) => item.id === 'spec');

    assert.ok(constitution);
    assert.ok(spec);
    assert.strictEqual(
      constitution?.uri.fsPath,
      vscode.Uri.joinPath(workspaceRoot, '.specify', 'memory', 'constitution.md').fsPath
    );
    assert.strictEqual(
      spec?.uri.fsPath,
      vscode.Uri.joinPath(featureRoot, 'spec.md').fsPath
    );
  });

  test('does not include .github artifacts in expectations', () => {
    const workspaceRoot = vscode.Uri.file('/tmp/workspace');
    const featureRoot = vscode.Uri.file('/tmp/workspace/specs/001-feature');
    const descriptors = buildExpectedArtifacts({ workspaceRoot, featureRoot });

    const githubSegment = `${path.sep}.github${path.sep}`;
    const hasGithub = descriptors.some((item) => item.uri.fsPath.includes(githubSegment));
    assert.strictEqual(hasGithub, false);
  });

  test('builds memory artifacts for non-feature branches', () => {
    const workspaceRoot = vscode.Uri.file('/tmp/workspace');
    const descriptors = buildMemoryArtifacts(workspaceRoot);

    assert.ok(descriptors.length > 0);
    const constitution = descriptors.find((item) => item.id === 'constitution');
    const spec = descriptors.find((item) => item.id === 'spec');

    assert.ok(constitution);
    assert.strictEqual(
      constitution?.uri.fsPath,
      vscode.Uri.joinPath(workspaceRoot, '.specify', 'memory', 'constitution.md').fsPath
    );
    assert.strictEqual(spec, undefined);
  });

  test('treats whitespace-only constitution content as missing', () => {
    assert.strictEqual(hasNonWhitespaceContent('   '), false);
    assert.strictEqual(hasNonWhitespaceContent('\n\t'), false);
    assert.strictEqual(hasNonWhitespaceContent('  content '), true);
  });
});
