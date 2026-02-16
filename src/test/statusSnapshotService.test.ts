import * as assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { buildStatusSnapshot } from '../services/statusSnapshotService';
import { appendWorkflowEvents, readWorkflowHistory, WorkflowHistoryContext } from '../services/workflowHistoryService';
import { computeWorkflowSteps } from '../services/workflowStatusService';
import { Artifact, BranchContext } from '../models/statusModels';

function createTestContext(): WorkflowHistoryContext {
  const storageRoot = path.join(os.tmpdir(), `spec-kit-snapshot-${Date.now()}`);
  const storageUri = vscode.Uri.file(storageRoot);
  const state = new Map<string, unknown>();

  const workspaceState: vscode.Memento = {
    get: <T>(key: string, defaultValue?: T) => {
      if (state.has(key)) {
        return state.get(key) as T;
      }
      return defaultValue as T;
    },
    keys: () => Array.from(state.keys()),
    update: async (key, value) => {
      state.set(key, value);
    },
  };

  return {
    storageUri,
    workspaceState,
  };
}

function buildArtifactSnapshot(): { branchContext: BranchContext; artifacts: Artifact[] } {
  const artifacts: Artifact[] = [
    {
      id: 'constitution',
      label: 'Constitution',
      uri: vscode.Uri.file('/tmp/constitution.md'),
      kind: 'file',
      stepId: 'constitution',
      status: 'complete',
      adjustmentCount: 0,
    },
    {
      id: 'spec',
      label: 'Spec',
      uri: vscode.Uri.file('/tmp/spec.md'),
      kind: 'file',
      stepId: 'specify',
      status: 'complete',
      adjustmentCount: 0,
    },
  ];

  return {
    branchContext: {
      branchName: '001-first',
      featureFolderName: '001-first',
      matchStatus: 'matched',
    },
    artifacts,
  };
}

suite('statusSnapshotService', () => {
  test('falls back to artifact status when no history exists', async () => {
    const context = createTestContext();
    const artifactSnapshot = buildArtifactSnapshot();
    const workspaceRoot = vscode.Uri.file('/tmp/spec-kit-workspace');

    const snapshot = await buildStatusSnapshot({
      context,
      artifactSnapshot,
      workspaceRoot,
    });

    assert.strictEqual(snapshot.statusSource, 'artifact-fallback');
    assert.ok(snapshot.lastUpdated);

    const expected = computeWorkflowSteps(artifactSnapshot.artifacts, artifactSnapshot.branchContext);
    const current = snapshot.workflow.find((step) => step.status === 'current');
    assert.strictEqual(current?.id, expected.find((step) => step.status === 'current')?.id);

    const branchKey = `${workspaceRoot.fsPath}:001-first`;
    const history = await readWorkflowHistory(context, branchKey);
    assert.ok(history);
    assert.strictEqual(history?.events.some((event) => event.type === 'artifact-scan'), true);
  });

  test('uses session history when available', async () => {
    const context = createTestContext();
    const artifactSnapshot = buildArtifactSnapshot();
    const workspaceRoot = vscode.Uri.file('/tmp/spec-kit-workspace');
    const branchKey = `${workspaceRoot.fsPath}:001-first`;

    await appendWorkflowEvents(context, branchKey, [
      {
        id: 'event-1',
        branchKey,
        type: 'manual',
        stepId: 'constitution',
        label: 'Constitution completed',
        timestamp: '2026-02-13T00:00:00.000Z',
        source: 'session-log',
      },
      {
        id: 'event-2',
        branchKey,
        type: 'manual',
        stepId: 'specify',
        label: 'Spec completed',
        timestamp: '2026-02-13T00:01:00.000Z',
        source: 'session-log',
      },
    ]);

    const snapshot = await buildStatusSnapshot({
      context,
      artifactSnapshot,
      workspaceRoot,
    });

    assert.strictEqual(snapshot.statusSource, 'session-log');
    const planStep = snapshot.workflow.find((step) => step.id === 'plan');
    assert.strictEqual(planStep?.status, 'current');
  });

  test('ignores history from other branches', async () => {
    const context = createTestContext();
    const artifactSnapshot = buildArtifactSnapshot();
    const workspaceRoot = vscode.Uri.file('/tmp/spec-kit-workspace');
    const otherBranchKey = `${workspaceRoot.fsPath}:002-other`;

    await appendWorkflowEvents(context, otherBranchKey, [
      {
        id: 'event-1',
        branchKey: otherBranchKey,
        type: 'manual',
        stepId: 'specify',
        label: 'Spec completed',
        timestamp: '2026-02-13T00:00:00.000Z',
        source: 'session-log',
      },
    ]);

    const snapshot = await buildStatusSnapshot({
      context,
      artifactSnapshot,
      workspaceRoot,
    });

    assert.strictEqual(snapshot.statusSource, 'artifact-fallback');
  });
});
