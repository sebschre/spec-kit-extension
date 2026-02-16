import * as assert from 'assert';
import * as vscode from 'vscode';
import { computeRecommendation, computeWorkflowSteps } from '../services/workflowStatusService';
import { Artifact } from '../models/statusModels';

suite('workflowStatusService', () => {
  test('sets current step based on first incomplete required step', () => {
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

    const workflow = computeWorkflowSteps(artifacts, undefined, {
      completed: 1,
      total: 1,
      ratio: 1,
      text: 'Tasks 1/1',
      bar: '[##########]',
    });
    const planStep = workflow.find((step) => step.id === 'plan');

    assert.strictEqual(planStep?.status, 'current');
  });

  test('treats open questions as existing for step completion', () => {
    const artifacts: Artifact[] = [
      {
        id: 'constitution',
        label: 'Constitution',
        uri: vscode.Uri.file('/tmp/constitution.md'),
        kind: 'file',
        stepId: 'constitution',
        status: 'open-questions',
        adjustmentCount: 2,
      },
      {
        id: 'spec',
        label: 'Spec',
        uri: vscode.Uri.file('/tmp/spec.md'),
        kind: 'file',
        stepId: 'specify',
        status: 'open-questions',
        adjustmentCount: 1,
      },
      {
        id: 'checklist-requirements',
        label: 'Checklist (Requirements)',
        uri: vscode.Uri.file('/tmp/checklists/requirements.md'),
        kind: 'file',
        stepId: 'checklist',
        status: 'open-questions',
        adjustmentCount: 1,
      },
    ];

    const workflow = computeWorkflowSteps(artifacts, undefined, {
      completed: 1,
      total: 1,
      ratio: 1,
      text: 'Tasks 1/1',
      bar: '[##########]',
    });
    const planStep = workflow.find((step) => step.id === 'plan');

    assert.strictEqual(planStep?.status, 'current');
  });

  test('requires all artifacts to be good for analyze completion', () => {
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
      {
        id: 'plan',
        label: 'Plan',
        uri: vscode.Uri.file('/tmp/plan.md'),
        kind: 'file',
        stepId: 'plan',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'data-model',
        label: 'Data Model',
        uri: vscode.Uri.file('/tmp/data-model.md'),
        kind: 'file',
        stepId: 'analyze',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'contracts',
        label: 'Contracts',
        uri: vscode.Uri.file('/tmp/contracts'),
        kind: 'folder',
        stepId: 'analyze',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'tasks',
        label: 'Tasks',
        uri: vscode.Uri.file('/tmp/tasks.md'),
        kind: 'file',
        stepId: 'tasks',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'research',
        label: 'Research',
        uri: vscode.Uri.file('/tmp/research.md'),
        kind: 'file',
        stepId: 'analyze',
        status: 'open-questions',
        adjustmentCount: 1,
      },
    ];

    const workflow = computeWorkflowSteps(artifacts, undefined, {
      completed: 1,
      total: 1,
      ratio: 1,
      text: 'Tasks 1/1',
      bar: '[##########]',
    });
    const analyzeStep = workflow.find((step) => step.id === 'analyze');

    assert.strictEqual(analyzeStep?.status, 'current');
  });

  test('orders Analyze before Implement after Tasks', () => {
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
      {
        id: 'plan',
        label: 'Plan',
        uri: vscode.Uri.file('/tmp/plan.md'),
        kind: 'file',
        stepId: 'plan',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'tasks',
        label: 'Tasks',
        uri: vscode.Uri.file('/tmp/tasks.md'),
        kind: 'file',
        stepId: 'tasks',
        status: 'complete',
        adjustmentCount: 0,
      },
    ];

    const workflow = computeWorkflowSteps(artifacts);
    const stepIds = workflow.map((step) => step.id);

    const tasksIndex = stepIds.indexOf('tasks');
    const analyzeIndex = stepIds.indexOf('analyze');
    const implementIndex = stepIds.indexOf('implement');

    assert.ok(tasksIndex > -1);
    assert.ok(analyzeIndex > tasksIndex);
    assert.ok(implementIndex > analyzeIndex);
  });

  test('threads task progress into Implement step', () => {
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
      {
        id: 'plan',
        label: 'Plan',
        uri: vscode.Uri.file('/tmp/plan.md'),
        kind: 'file',
        stepId: 'plan',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'tasks',
        label: 'Tasks',
        uri: vscode.Uri.file('/tmp/tasks.md'),
        kind: 'file',
        stepId: 'tasks',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'research',
        label: 'Research',
        uri: vscode.Uri.file('/tmp/research.md'),
        kind: 'file',
        stepId: 'analyze',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'data-model',
        label: 'Data Model',
        uri: vscode.Uri.file('/tmp/data-model.md'),
        kind: 'file',
        stepId: 'analyze',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'contracts',
        label: 'Contracts',
        uri: vscode.Uri.file('/tmp/contracts'),
        kind: 'folder',
        stepId: 'analyze',
        status: 'complete',
        adjustmentCount: 0,
      },
    ];

    const taskProgress = {
      completed: 1,
      total: 4,
      ratio: 0.25,
      text: 'Tasks 1/4',
      bar: '[##--------]',
    };

    const workflow = computeWorkflowSteps(artifacts, undefined, taskProgress);
    const implementStep = workflow.find((step) => step.id === 'implement');

    assert.ok(implementStep);
    assert.strictEqual(implementStep?.status, 'current');
    assert.deepStrictEqual(implementStep?.progress, taskProgress);
  });

  test('marks workflow as incomplete when branch context is missing', () => {
    const workflow = computeWorkflowSteps([], {
      branchName: null,
      featureFolderName: null,
      matchStatus: 'missing',
    });

    assert.ok(workflow.length > 0);
    assert.strictEqual(workflow[0].status, 'incomplete');
  });

  test('recommends earliest incomplete step and artifact', () => {
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

    const recommendation = computeRecommendation(artifacts);

    assert.ok(recommendation);
    assert.strictEqual(recommendation?.stepId, 'specify');
    assert.strictEqual(recommendation?.artifactId, 'spec');
  });

  test('recommends Implement when tasks are incomplete', () => {
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
      {
        id: 'plan',
        label: 'Plan',
        uri: vscode.Uri.file('/tmp/plan.md'),
        kind: 'file',
        stepId: 'plan',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'tasks',
        label: 'Tasks',
        uri: vscode.Uri.file('/tmp/tasks.md'),
        kind: 'file',
        stepId: 'tasks',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'research',
        label: 'Research',
        uri: vscode.Uri.file('/tmp/research.md'),
        kind: 'file',
        stepId: 'analyze',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'data-model',
        label: 'Data Model',
        uri: vscode.Uri.file('/tmp/data-model.md'),
        kind: 'file',
        stepId: 'analyze',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'quickstart',
        label: 'Quickstart',
        uri: vscode.Uri.file('/tmp/quickstart.md'),
        kind: 'file',
        stepId: 'analyze',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'contracts',
        label: 'Contracts',
        uri: vscode.Uri.file('/tmp/contracts'),
        kind: 'folder',
        stepId: 'analyze',
        status: 'complete',
        adjustmentCount: 0,
      },
    ];

    const recommendation = computeRecommendation(artifacts, {
      completed: 2,
      total: 5,
      ratio: 0.4,
      text: 'Tasks 2/5',
      bar: '[####------]',
    });

    assert.ok(recommendation);
    assert.strictEqual(recommendation?.stepId, 'implement');
    assert.strictEqual(recommendation?.artifactId, 'tasks');
  });

  test('returns no recommendation when tasks are complete', () => {
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
      {
        id: 'plan',
        label: 'Plan',
        uri: vscode.Uri.file('/tmp/plan.md'),
        kind: 'file',
        stepId: 'plan',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'tasks',
        label: 'Tasks',
        uri: vscode.Uri.file('/tmp/tasks.md'),
        kind: 'file',
        stepId: 'tasks',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'research',
        label: 'Research',
        uri: vscode.Uri.file('/tmp/research.md'),
        kind: 'file',
        stepId: 'analyze',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'data-model',
        label: 'Data Model',
        uri: vscode.Uri.file('/tmp/data-model.md'),
        kind: 'file',
        stepId: 'analyze',
        status: 'complete',
        adjustmentCount: 0,
      },
      {
        id: 'contracts',
        label: 'Contracts',
        uri: vscode.Uri.file('/tmp/contracts'),
        kind: 'folder',
        stepId: 'analyze',
        status: 'complete',
        adjustmentCount: 0,
      },
    ];

    const recommendation = computeRecommendation(artifacts, {
      completed: 3,
      total: 3,
      ratio: 1,
      text: 'Tasks 3/3',
      bar: '[##########]',
    });

    assert.strictEqual(recommendation, null);
  });
});
