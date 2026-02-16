import * as assert from 'assert';
import * as vscode from 'vscode';
import { StatusViewProvider } from '../views/statusView';
import { Artifact } from '../models/statusModels';

suite('statusView workflow integration', () => {
  test('renders workflow items with current status', async () => {
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
      {
        id: 'checklist-requirements',
        label: 'Checklist (Requirements)',
        uri: vscode.Uri.file('/tmp/checklists/requirements.md'),
        kind: 'file',
        stepId: 'checklist',
        status: 'complete',
        adjustmentCount: 0,
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
    const workflowRoot = roots.find((item) => item.label === 'Workflow');

    assert.ok(workflowRoot);
    const workflowItems = await provider.getChildren(workflowRoot);
    const planItem = workflowItems.find((item) => item.label === 'Plan');
    const implementItem = workflowItems.find((item) => item.label === 'Implement');
    const analyzeIndex = workflowItems.findIndex((item) => item.label === 'Analyze');
    const implementIndex = workflowItems.findIndex((item) => item.label === 'Implement');

    assert.ok(planItem);
    assert.strictEqual(planItem?.description?.toString().includes('Current'), true);
    assert.ok(implementItem);
    assert.ok(analyzeIndex > -1);
    assert.ok(implementIndex > -1);
    assert.ok(analyzeIndex < implementIndex);
  });

  test('renders sections when initialized', async () => {
    const provider = new StatusViewProvider(async () => ({
      branchContext: {
        branchName: '001-first',
        featureFolderName: '001-first',
        matchStatus: 'matched',
      },
      artifacts: [],
    }));
    await provider.refresh();

    const roots = await provider.getChildren();
    const labels = roots.map((item) => item.label);

    assert.ok(labels.includes('Workflow'));
    assert.ok(labels.includes('Spec Artifacts'));
    assert.ok(labels.includes('Recommendation'));
  });

  test('renders workflow items with incomplete label when not matched', async () => {
    const provider = new StatusViewProvider(async () => ({
      branchContext: {
        branchName: null,
        featureFolderName: null,
        matchStatus: 'missing',
      },
      artifacts: [],
    }));
    await provider.refresh();

    const roots = await provider.getChildren();
    const workflowRoot = roots.find((item) => item.label === 'Workflow');

    assert.ok(workflowRoot);
    const workflowItems = await provider.getChildren(workflowRoot);
    assert.ok(workflowItems.length > 0);
    assert.strictEqual(workflowItems[0].description?.toString().includes('Incomplete'), true);
  });

  test('renders recommendation section with next step', async () => {
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
        status: 'missing',
        adjustmentCount: 0,
      },
    ];

    const provider = new StatusViewProvider(async () => ({
      branchContext: {
        branchName: '001-first',
        featureFolderName: '001-first',
        matchStatus: 'matched',
      },
      artifacts,
      recommendation: {
        stepId: 'implement',
        stepLabel: 'Implement',
        artifactId: 'tasks',
        artifactLabel: 'Tasks',
        reason: 'Tasks incomplete',
      },
    }));
    await provider.refresh();

    const roots = await provider.getChildren();
    const recommendationRoot = roots.find((item) => item.label === 'Recommendation');

    assert.ok(recommendationRoot);
    const recommendationItems = await provider.getChildren(recommendationRoot);
    assert.strictEqual(recommendationItems.length, 1);
    assert.strictEqual(recommendationItems[0].label?.toString().includes('Next: Implement'), true);
  });

  test('renders initialization message when Spec Kit is not initialized', async () => {
    const provider = new StatusViewProvider(async () => ({
      branchContext: {
        branchName: null,
        featureFolderName: null,
        matchStatus: 'missing',
      },
      artifacts: [],
      initializationState: {
        initialized: false,
        message: 'spec-kit not initialized',
      },
    }));
    await provider.refresh();

    const roots = await provider.getChildren();

    assert.strictEqual(roots.length, 1);
    assert.strictEqual(roots[0].label, 'spec-kit not initialized');
  });

  test('renders implement progress text and bar', async () => {
    const provider = new StatusViewProvider(async () => ({
      branchContext: {
        branchName: '001-first',
        featureFolderName: '001-first',
        matchStatus: 'matched',
      },
      artifacts: [],
      workflow: [
        { id: 'constitution', label: 'Constitution', order: 1, optional: false, status: 'complete', artifactIds: [] },
        { id: 'specify', label: 'Specify', order: 2, optional: false, status: 'complete', artifactIds: [] },
        { id: 'plan', label: 'Plan', order: 3, optional: false, status: 'complete', artifactIds: [] },
        { id: 'tasks', label: 'Tasks', order: 4, optional: false, status: 'complete', artifactIds: [] },
        { id: 'analyze', label: 'Analyze', order: 5, optional: false, status: 'complete', artifactIds: [] },
        {
          id: 'implement',
          label: 'Implement',
          order: 6,
          optional: false,
          status: 'current',
          artifactIds: ['tasks'],
          progress: {
            completed: 2,
            total: 5,
            ratio: 0.4,
            text: 'Tasks 2/5',
            bar: '[####------]',
          },
        },
      ],
    }));
    await provider.refresh();

    const roots = await provider.getChildren();
    const workflowRoot = roots.find((item) => item.label === 'Workflow');

    assert.ok(workflowRoot);
    const workflowItems = await provider.getChildren(workflowRoot);
    const implementItem = workflowItems.find((item) => item.label === 'Implement');

    assert.ok(implementItem);
    assert.strictEqual(implementItem?.description?.toString().includes('Tasks 2/5'), true);
    assert.strictEqual(implementItem?.description?.toString().includes('[####------]'), true);
  });
});
