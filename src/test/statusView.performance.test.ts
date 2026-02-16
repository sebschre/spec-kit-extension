import * as assert from 'assert';
import * as vscode from 'vscode';
import { performance } from 'node:perf_hooks';
import { StatusViewProvider } from '../views/statusView';
import { Artifact } from '../models/statusModels';

function buildArtifacts(count: number): Artifact[] {
  const artifacts: Artifact[] = [];
  for (let i = 0; i < count; i += 1) {
    artifacts.push({
      id: `artifact-${i}`,
      label: `Artifact ${i}`,
      uri: vscode.Uri.file(`/tmp/artifact-${i}.md`),
      kind: 'file',
      stepId: 'specify',
      status: 'complete',
      adjustmentCount: 0,
    });
  }

  return artifacts;
}

suite('statusView performance', () => {
  test('refreshes initial view within 2 seconds', async () => {
    const artifacts = buildArtifacts(100);
    const provider = new StatusViewProvider(async () => ({
      branchContext: {
        branchName: '001-first',
        featureFolderName: '001-first',
        matchStatus: 'matched',
      },
      artifacts,
    }));

    const start = performance.now();
    await provider.refresh();
    await provider.getChildren();
    const elapsedMs = performance.now() - start;

    assert.ok(elapsedMs < 2000, `Expected < 2000ms, got ${elapsedMs.toFixed(1)}ms`);
  });

  test('expands sections within 250ms', async () => {
    const artifacts = buildArtifacts(100);
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
    const workflowRoot = roots.find((item) => item.label === 'Workflow');
    const artifactsRoot = roots.find((item) => item.label === 'Spec Artifacts');

    assert.ok(workflowRoot && artifactsRoot);

    const start = performance.now();
    await provider.getChildren(workflowRoot);
    await provider.getChildren(artifactsRoot);
    const elapsedMs = performance.now() - start;

    assert.ok(elapsedMs < 250, `Expected < 250ms, got ${elapsedMs.toFixed(1)}ms`);
  });
});
