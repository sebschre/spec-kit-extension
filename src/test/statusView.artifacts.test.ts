import * as assert from 'assert';
import * as vscode from 'vscode';
import { StatusViewProvider } from '../views/statusView';
import { Artifact } from '../models/statusModels';

suite('statusView artifacts integration', () => {
  test('renders artifact items with status descriptions', async () => {
    const artifacts: Artifact[] = [
      {
        id: 'spec',
        label: 'Spec',
        uri: vscode.Uri.file('/tmp/spec.md'),
        kind: 'file',
        stepId: 'specify',
        status: 'open-questions',
        adjustmentCount: 2,
        adjustments: [
          {
            id: 'spec-1',
            label: 'TODO',
            filePath: '/tmp/spec.md',
            line: 1,
            column: 1,
          },
          {
            id: 'spec-2',
            label: '[FEATURE NAME]',
            filePath: '/tmp/spec.md',
            line: 2,
            column: 5,
          },
        ],
      },
    ];

    const provider = new StatusViewProvider(async () => ({
      branchContext: {
        branchName: '001-first',
        featureFolderName: '001-first',
        matchStatus: 'matched',
      },
      artifacts,
    }));
    await provider.refresh();

    const roots = await provider.getChildren();
    const artifactsRoot = roots.find((item) => item.label === 'Spec Artifacts');

    assert.ok(artifactsRoot);
    const artifactItems = await provider.getChildren(artifactsRoot);
    const specItem = artifactItems.find((item) => item.label === 'Spec');

    assert.ok(specItem);
    assert.strictEqual(specItem?.description?.toString().includes('Open Questions'), true);
    assert.strictEqual(specItem?.description?.toString().includes('2 adjustments'), true);

    const adjustmentItems = await provider.getChildren(specItem);
    assert.strictEqual(adjustmentItems.length, 2);
    assert.strictEqual(adjustmentItems[0].label, 'TODO');
    assert.strictEqual(adjustmentItems[1].label, '[FEATURE NAME]');
  });

  test('renders no artifacts available when empty', async () => {
    const provider = new StatusViewProvider(async () => ({
      branchContext: {
        branchName: '999-missing',
        featureFolderName: null,
        matchStatus: 'missing',
      },
      artifacts: [],
    }));
    await provider.refresh();

    const roots = await provider.getChildren();
    const artifactsRoot = roots.find((item) => item.label === 'Spec Artifacts');

    assert.ok(artifactsRoot);
    const artifactItems = await provider.getChildren(artifactsRoot);
    const emptyItem = artifactItems.find((item) => item.label === 'No artifacts available');

    assert.ok(emptyItem);
  });
});
