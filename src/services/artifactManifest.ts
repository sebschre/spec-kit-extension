import { ArtifactKind } from '../models/statusModels';

export type ArtifactSource = 'feature-folder' | 'memory';

export type ArtifactExpectation = {
  id: string;
  label: string;
  kind: ArtifactKind;
  stepId: string;
  relativePath: string;
  source: ArtifactSource;
  checklistRelativePath?: string;
};

export const ARTIFACT_MANIFEST: ArtifactExpectation[] = [
  {
    id: 'constitution',
    label: 'Constitution',
    kind: 'file',
    stepId: 'constitution',
    relativePath: 'constitution.md',
    source: 'memory',
  },
  {
    id: 'spec',
    label: 'Spec',
    kind: 'file',
    stepId: 'specify',
    relativePath: 'spec.md',
    source: 'feature-folder',
    checklistRelativePath: 'checklists/requirements.md',
  },
  {
    id: 'plan',
    label: 'Plan',
    kind: 'file',
    stepId: 'plan',
    relativePath: 'plan.md',
    source: 'feature-folder',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    kind: 'file',
    stepId: 'tasks',
    relativePath: 'tasks.md',
    source: 'feature-folder',
  },
  {
    id: 'research',
    label: 'Research',
    kind: 'file',
    stepId: 'analyze',
    relativePath: 'research.md',
    source: 'feature-folder',
  },
  {
    id: 'data-model',
    label: 'Data Model',
    kind: 'file',
    stepId: 'analyze',
    relativePath: 'data-model.md',
    source: 'feature-folder',
  },
  {
    id: 'quickstart',
    label: 'Quickstart',
    kind: 'file',
    stepId: 'analyze',
    relativePath: 'quickstart.md',
    source: 'feature-folder',
  },
  {
    id: 'contracts',
    label: 'Contracts',
    kind: 'folder',
    stepId: 'analyze',
    relativePath: 'contracts',
    source: 'feature-folder',
  },
  {
    id: 'checklist-requirements',
    label: 'Checklist (Requirements)',
    kind: 'file',
    stepId: 'checklist',
    relativePath: 'checklists/requirements.md',
    source: 'feature-folder',
  },
];
