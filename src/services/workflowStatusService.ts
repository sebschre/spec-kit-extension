import { Artifact, BranchContext, Recommendation, TaskProgress, WorkflowStep } from '../models/statusModels';
import { WorkflowHistoryEvent } from './workflowHistoryService';

const BASE_STEPS = [
  { id: 'constitution', label: 'Constitution', order: 1, optional: false },
  { id: 'specify', label: 'Specify', order: 2, optional: false },
  { id: 'plan', label: 'Plan', order: 3, optional: false },
  { id: 'tasks', label: 'Tasks', order: 4, optional: false },
  { id: 'analyze', label: 'Analyze', order: 5, optional: false },
  { id: 'implement', label: 'Implement', order: 6, optional: false },
];

const STEP_REQUIREMENTS: Record<string, string[]> = {
  constitution: ['constitution'],
  specify: ['spec', 'checklist-requirements'],
  plan: ['plan', 'research', 'data-model', 'contracts'],
  tasks: ['tasks'],
};

type StepEvaluation = {
  id: string;
  label: string;
  order: number;
  optional: boolean;
  artifactIds: string[];
  isComplete: boolean;
};

function isArtifactGood(status: Artifact['status']): boolean {
  return status === 'complete' || status === 'validated';
}

function isArtifactPresent(status: Artifact['status']): boolean {
  return status !== 'missing';
}

function evaluateSteps(artifacts: Artifact[], taskProgress?: TaskProgress): StepEvaluation[] {
  const artifactsById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));

  return BASE_STEPS.map((step) => {
    const requiredIds = step.id === 'analyze'
      ? artifacts.map((artifact) => artifact.id)
      : STEP_REQUIREMENTS[step.id] ?? [];
    const requiredArtifacts = requiredIds
      .map((id) => artifactsById.get(id))
      .filter((artifact): artifact is Artifact => Boolean(artifact));
    const isImplementComplete = step.id === 'implement'
      && taskProgress !== undefined
      && taskProgress.total > 0
      && taskProgress.completed >= taskProgress.total;
    const isComplete = step.id === 'implement'
      ? isImplementComplete
      : requiredIds.length > 0
      && requiredArtifacts.length === requiredIds.length
      && requiredArtifacts.every((artifact) =>
        step.id === 'analyze'
          ? isArtifactGood(artifact.status)
          : isArtifactPresent(artifact.status)
      );

    return {
      ...step,
      artifactIds: step.id === 'implement' ? ['tasks'] : requiredIds,
      isComplete,
    };
  });
}

export function computeRecommendation(
  artifacts: Artifact[],
  taskProgress?: TaskProgress
): Recommendation | null {
  if (!artifacts.length) {
    return null;
  }

  const artifactsById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));

  for (const step of BASE_STEPS) {
    if (step.id === 'analyze') {
      const target = artifacts.find((artifact) => !isArtifactGood(artifact.status));
      if (target) {
        const reason = target.status === 'missing'
          ? 'Required artifact missing'
          : 'Artifact needs attention';
        return {
          stepId: step.id,
          stepLabel: step.label,
          artifactId: target.id,
          artifactLabel: target.label,
          reason,
        };
      }
      continue;
    }

    if (step.id === 'implement') {
      if (taskProgress && taskProgress.total > 0) {
        if (taskProgress.completed >= taskProgress.total) {
          return null;
        }

        return {
          stepId: step.id,
          stepLabel: step.label,
          artifactId: 'tasks',
          artifactLabel: artifactsById.get('tasks')?.label ?? 'Tasks',
          reason: 'Tasks incomplete',
        };
      }
      continue;
    }

    const requiredIds = STEP_REQUIREMENTS[step.id] ?? [];
    const missingId = requiredIds.find((id) => {
      const artifact = artifactsById.get(id);
      return !artifact || !isArtifactPresent(artifact.status);
    });

    if (missingId) {
      const artifact = artifactsById.get(missingId);
      return {
        stepId: step.id,
        stepLabel: step.label,
        artifactId: missingId,
        artifactLabel: artifact?.label ?? missingId,
        reason: 'Required artifact missing',
      };
    }
  }

  return null;
}

export function computeWorkflowSteps(
  artifacts: Artifact[],
  branchContext?: BranchContext,
  taskProgress?: TaskProgress
): WorkflowStep[] {
  if (branchContext && branchContext.matchStatus !== 'matched') {
    return BASE_STEPS.map((step) => ({
      id: step.id,
      label: step.label,
      order: step.order,
      optional: step.optional,
      status: 'incomplete',
      artifactIds: [],
    }));
  }

  const evaluated = evaluateSteps(artifacts, taskProgress);
  let currentIndex = evaluated.findIndex((step) => !step.isComplete);

  if (currentIndex === -1) {
    currentIndex = evaluated.length - 1;
  }

  return evaluated.map((step, index) => {
    let status: WorkflowStep['status'] = 'upcoming';

    if (index < currentIndex) {
      status = step.isComplete ? 'complete' : 'incomplete';
    } else if (index === currentIndex) {
      status = 'current';
    }

    return {
      id: step.id,
      label: step.label,
      order: step.order,
      optional: step.optional,
      status,
      artifactIds: step.artifactIds,
      progress: step.id === 'implement' ? taskProgress : undefined,
    };
  });
}

export function computeWorkflowStepsFromEvents(
  events: WorkflowHistoryEvent[],
  branchContext?: BranchContext
): WorkflowStep[] {
  if (branchContext && branchContext.matchStatus !== 'matched') {
    return BASE_STEPS.map((step) => ({
      id: step.id,
      label: step.label,
      order: step.order,
      optional: step.optional,
      status: 'incomplete',
      artifactIds: [],
    }));
  }

  const completedStepIds = new Set(
    events
      .filter((event) => event.source === 'session-log')
      .map((event) => event.stepId)
  );

  const baseSteps = BASE_STEPS.map((step) => {
    const artifactIds = step.id === 'analyze'
      ? []
      : STEP_REQUIREMENTS[step.id] ?? [];
    return {
      ...step,
      artifactIds,
    };
  });

  let currentIndex = baseSteps.findIndex((step) => !completedStepIds.has(step.id));
  if (currentIndex === -1) {
    currentIndex = baseSteps.length - 1;
  }

  return baseSteps.map((step, index) => {
    let status: WorkflowStep['status'] = 'upcoming';

    if (index < currentIndex) {
      status = completedStepIds.has(step.id) ? 'complete' : 'incomplete';
    } else if (index === currentIndex) {
      status = 'current';
    }

    return {
      id: step.id,
      label: step.label,
      order: step.order,
      optional: step.optional,
      status,
      artifactIds: step.artifactIds,
    };
  });
}
