import * as vscode from 'vscode';

export type WorkflowStepStatus = 'complete' | 'current' | 'upcoming' | 'incomplete';
export type ArtifactStatus = 'validated' | 'complete' | 'open-questions' | 'missing';
export type ArtifactKind = 'file' | 'folder';
export type BranchMatchStatus = 'matched' | 'missing' | 'ambiguous';
export type StatusSource = 'session-log' | 'artifact-fallback';

export interface WorkflowStep {
  id: string;
  label: string;
  order: number;
  optional: boolean;
  status: WorkflowStepStatus;
  artifactIds: string[];
  progress?: TaskProgress;
}

export interface Artifact {
  id: string;
  label: string;
  uri: vscode.Uri;
  kind: ArtifactKind;
  stepId: string;
  status: ArtifactStatus;
  adjustmentCount: number;
  adjustments?: Adjustment[];
  lastUpdated?: string;
}

export interface Adjustment {
  id: string;
  label: string;
  filePath: string;
  line?: number;
  column?: number;
}

export interface Recommendation {
  stepId: string;
  stepLabel: string;
  artifactId: string;
  artifactLabel: string;
  reason: string;
}

export interface InitializationState {
  initialized: boolean;
  message?: string;
}

export interface TaskProgress {
  completed: number;
  total: number;
  ratio: number;
  text: string;
  bar: string;
}

export interface BranchContext {
  branchName: string | null;
  featureFolderName: string | null;
  matchStatus: BranchMatchStatus;
}

export interface StatusSnapshot {
  branchContext: BranchContext;
  artifacts: Artifact[];
  workflow?: WorkflowStep[];
  initializationState?: InitializationState;
  taskProgress?: TaskProgress;
  statusSource?: StatusSource;
  lastUpdated?: string;
  recommendation?: Recommendation | null;
}

export interface ChecklistStatus {
  total: number;
  checked: number;
}
