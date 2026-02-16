import * as assert from 'assert';
import * as vscode from 'vscode';
import { resolveBranchContext } from '../services/gitContextService';

suite('gitContextService', () => {
  test('returns matched context for exact branch', () => {
    const specFolders = [
      { name: '001-first', uri: vscode.Uri.file('/tmp/specs/001-first'), mtime: 1 },
      { name: '002-second', uri: vscode.Uri.file('/tmp/specs/002-second'), mtime: 2 },
    ];

    const result = resolveBranchContext({ branchName: '001-first', specFolders });
    assert.strictEqual(result.branchContext.matchStatus, 'matched');
    assert.strictEqual(result.branchContext.featureFolderName, '001-first');
    assert.ok(result.featureFolder);
    assert.strictEqual(result.featureFolder?.name, '001-first');
  });

  test('returns missing context when branch not found', () => {
    const specFolders = [
      { name: '001-first', uri: vscode.Uri.file('/tmp/specs/001-first'), mtime: 1 },
      { name: '002-second', uri: vscode.Uri.file('/tmp/specs/002-second'), mtime: 5 },
    ];

    const result = resolveBranchContext({ branchName: '003-missing', specFolders });
    assert.strictEqual(result.branchContext.matchStatus, 'missing');
    assert.strictEqual(result.branchContext.featureFolderName, null);
    assert.strictEqual(result.featureFolder, null);
  });

  test('does not match when only the prefix aligns', () => {
    const specFolders = [
      { name: '001-first-extra', uri: vscode.Uri.file('/tmp/specs/001-first-extra'), mtime: 1 },
    ];

    const result = resolveBranchContext({ branchName: '001-first', specFolders });
    assert.strictEqual(result.branchContext.matchStatus, 'missing');
    assert.strictEqual(result.branchContext.featureFolderName, null);
    assert.strictEqual(result.featureFolder, null);
  });

  test('returns ambiguous context when multiple matches exist', () => {
    const specFolders = [
      { name: '001-first', uri: vscode.Uri.file('/tmp/specs/001-first'), mtime: 1 },
      { name: '001-first', uri: vscode.Uri.file('/tmp/other/specs/001-first'), mtime: 2 },
    ];

    const result = resolveBranchContext({ branchName: '001-first', specFolders });
    assert.strictEqual(result.branchContext.matchStatus, 'ambiguous');
    assert.strictEqual(result.branchContext.featureFolderName, null);
    assert.strictEqual(result.featureFolder, null);
  });
});
