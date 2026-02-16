import * as vscode from 'vscode';
import {
  Artifact,
  BranchContext,
  InitializationState,
  StatusSource,
  TaskProgress,
  WorkflowStep,
} from '../models/statusModels';
import { getStatusSnapshot as getArtifactSnapshot } from './artifactStatusService';
import { computeWorkflowSteps, computeWorkflowStepsFromEvents } from './workflowStatusService';
import {
  appendWorkflowEvents,
  buildBranchKey,
  readWorkflowHistory,
  WorkflowHistoryContext,
  WorkflowHistoryEvent,
} from './workflowHistoryService';

const ARTIFACT_SCAN_LABEL = 'Artifact scan';

type ArtifactSnapshot = {
  branchContext: BranchContext;
  artifacts: Artifact[];
  taskProgress?: TaskProgress;
  initializationState?: InitializationState;
};

export type WorkflowStatusSnapshot = ArtifactSnapshot & {
  workflow: WorkflowStep[];
  statusSource: StatusSource;
  lastUpdated: string;
};

function pickCurrentStep(workflow: WorkflowStep[]): WorkflowStep | null {
  return workflow.find((step) => step.status === 'current') ?? workflow[workflow.length - 1] ?? null;
}

function createArtifactScanEvent(branchKey: string, workflow: WorkflowStep[]): WorkflowHistoryEvent {
  const currentStep = pickCurrentStep(workflow);
  const stepId = currentStep?.id ?? 'implement';
  const timestamp = new Date().toISOString();

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    branchKey,
    type: 'artifact-scan',
    stepId,
    label: ARTIFACT_SCAN_LABEL,
    timestamp,
    source: 'artifact-fallback',
  };
}

function resolveStatusSource(events: WorkflowHistoryEvent[]): StatusSource {
  if (events.some((event) => event.source === 'session-log')) {
    return 'session-log';
  }

  return 'artifact-fallback';
}

export async function buildStatusSnapshot(options: {
  context: WorkflowHistoryContext;
  artifactSnapshot: ArtifactSnapshot;
  workspaceRoot?: vscode.Uri | null;
}): Promise<WorkflowStatusSnapshot> {
  const { context, artifactSnapshot } = options;
  const now = new Date().toISOString();
  const { branchContext, artifacts, taskProgress, initializationState } = artifactSnapshot;
  if (initializationState && !initializationState.initialized) {
    return {
      branchContext,
      artifacts,
      workflow: [],
      statusSource: 'artifact-fallback',
      lastUpdated: now,
      taskProgress,
      initializationState,
    };
  }
  const artifactWorkflow = computeWorkflowSteps(artifacts, branchContext, taskProgress);

  let workflow = artifactWorkflow;
  let statusSource: StatusSource = 'artifact-fallback';
  let lastUpdated = now;

  const workspaceRoot = options.workspaceRoot ?? vscode.workspace.workspaceFolders?.[0]?.uri ?? null;
  const branchKey = buildBranchKey({
    branchName: branchContext.branchName,
    workspaceRoot,
  });

  if (branchContext.matchStatus === 'matched' && branchKey) {
    const history = await readWorkflowHistory(context, branchKey);
    if (history && history.events.length > 0) {
      workflow = computeWorkflowStepsFromEvents(history.events, branchContext);
      if (taskProgress) {
        workflow = workflow.map((step) =>
          step.id === 'implement' ? { ...step, progress: taskProgress } : step
        );
      }
      statusSource = resolveStatusSource(history.events);
      lastUpdated = history.lastUpdated;
    }

    const artifactEvent = createArtifactScanEvent(branchKey, artifactWorkflow);
    const updatedLog = await appendWorkflowEvents(context, branchKey, [artifactEvent]);
    if (updatedLog) {
      lastUpdated = updatedLog.lastUpdated;
    }
  }

  return {
    branchContext,
    artifacts,
    workflow,
    statusSource,
    lastUpdated,
    taskProgress,
    initializationState,
  };
}

export async function getStatusSnapshot(context: WorkflowHistoryContext): Promise<WorkflowStatusSnapshot> {
  const artifactSnapshot = await getArtifactSnapshot();
  return buildStatusSnapshot({ context, artifactSnapshot });
}
