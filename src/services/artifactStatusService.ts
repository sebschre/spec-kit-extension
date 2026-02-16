import * as vscode from 'vscode';
import { performance } from 'node:perf_hooks';
import { Adjustment, Artifact, ArtifactKind, ArtifactStatus, StatusSnapshot, TaskProgress } from '../models/statusModels';
import {
  containsOpenQuestionMarkers,
  containsPlaceholderTokens,
  extractAdjustments,
  isChecklistComplete,
  parseTaskProgress,
} from '../utils/statusParser';
import { ARTIFACT_MANIFEST } from './artifactManifest';
import { getBranchContextForWorkspace } from './gitContextService';

export type ArtifactDescriptor = {
  id: string;
  label: string;
  uri: vscode.Uri;
  kind: ArtifactKind;
  stepId: string;
  checklistUri?: vscode.Uri;
};

const TEXT_DECODER = new TextDecoder('utf-8');

export function hasNonWhitespaceContent(text?: string | null): boolean {
  return Boolean(text && text.trim().length > 0);
}

export function buildExpectedArtifacts(options: {
  workspaceRoot: vscode.Uri;
  featureRoot: vscode.Uri;
}): ArtifactDescriptor[] {
  const { workspaceRoot, featureRoot } = options;
  const memoryRoot = vscode.Uri.joinPath(workspaceRoot, '.specify', 'memory');

  return ARTIFACT_MANIFEST.map((entry) => {
    const baseRoot = entry.source === 'memory' ? memoryRoot : featureRoot;
    const uri = vscode.Uri.joinPath(baseRoot, ...entry.relativePath.split('/'));
    const checklistUri = entry.checklistRelativePath
      ? vscode.Uri.joinPath(featureRoot, ...entry.checklistRelativePath.split('/'))
      : undefined;

    return {
      id: entry.id,
      label: entry.label,
      uri,
      kind: entry.kind,
      stepId: entry.stepId,
      checklistUri,
    };
  });
}

export function buildMemoryArtifacts(workspaceRoot: vscode.Uri): ArtifactDescriptor[] {
  const memoryRoot = vscode.Uri.joinPath(workspaceRoot, '.specify', 'memory');

  return ARTIFACT_MANIFEST.filter((entry) => entry.source === 'memory').map((entry) => {
    const uri = vscode.Uri.joinPath(memoryRoot, ...entry.relativePath.split('/'));
    return {
      id: entry.id,
      label: entry.label,
      uri,
      kind: entry.kind,
      stepId: entry.stepId,
    };
  });
}

async function readFileText(uri: vscode.Uri): Promise<string | null> {
  try {
    const data = await vscode.workspace.fs.readFile(uri);
    return TEXT_DECODER.decode(data);
  } catch {
    return null;
  }
}

async function isSpecKitInitialized(workspaceRoot: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.joinPath(workspaceRoot, '.specify'));
    return true;
  } catch {
    return false;
  }
}

export function classifyArtifactStatus(options: {
  exists: boolean;
  kind: ArtifactKind;
  text?: string | null;
  checklistComplete?: boolean;
}): ArtifactStatus {
  if (!options.exists) {
    return 'missing';
  }

  if (options.kind === 'folder') {
    return 'complete';
  }

  const content = options.text ?? '';
  if (containsOpenQuestionMarkers(content) || containsPlaceholderTokens(content)) {
    return 'open-questions';
  }

  if (options.checklistComplete) {
    return 'validated';
  }

  return 'complete';
}

async function computeArtifactStatus(
  descriptor: ArtifactDescriptor,
  textOverride?: string | null
): Promise<ArtifactStatus> {
  if (descriptor.kind === 'folder') {
    try {
      await vscode.workspace.fs.stat(descriptor.uri);
      return classifyArtifactStatus({ exists: true, kind: descriptor.kind });
    } catch {
      return classifyArtifactStatus({ exists: false, kind: descriptor.kind });
    }
  }

  const text = textOverride ?? await readFileText(descriptor.uri);
  if (text === null) {
    return classifyArtifactStatus({ exists: false, kind: descriptor.kind });
  }

  if (descriptor.id === 'constitution' && !hasNonWhitespaceContent(text)) {
    return classifyArtifactStatus({ exists: false, kind: descriptor.kind });
  }

  let checklistComplete = false;
  if (descriptor.checklistUri) {
    const checklistText = await readFileText(descriptor.checklistUri);
    checklistComplete = Boolean(checklistText && isChecklistComplete(checklistText));
  }

  return classifyArtifactStatus({
    exists: true,
    kind: descriptor.kind,
    text,
    checklistComplete,
  });
}

async function computeArtifactAdjustments(descriptor: ArtifactDescriptor): Promise<Adjustment[]> {
  if (descriptor.kind === 'folder') {
    return [];
  }

  const text = await readFileText(descriptor.uri);
  if (!text) {
    return [];
  }

  const matches = extractAdjustments(text);
  return matches.map((match, index) => ({
    id: `${descriptor.id}-${match.line}-${match.column}-${index}`,
    label: match.label,
    filePath: descriptor.uri.fsPath,
    line: match.line,
    column: match.column,
  }));
}

export async function getStatusSnapshot(): Promise<StatusSnapshot> {
  const start = performance.now();
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  if (!workspaceFolders.length) {
    return {
      branchContext: {
        branchName: null,
        featureFolderName: null,
        matchStatus: 'missing',
      },
      artifacts: [],
    };
  }

  const workspaceRoot = workspaceFolders[0].uri;
  const initialized = await isSpecKitInitialized(workspaceRoot);
  const initializationState = initialized
    ? undefined
    : { initialized: false, message: 'spec-kit not initialized' };
  const { branchContext, featureFolder } = await getBranchContextForWorkspace();
  const descriptors = featureFolder && branchContext.matchStatus === 'matched'
    ? buildExpectedArtifacts({
      workspaceRoot,
      featureRoot: featureFolder.uri,
    })
    : buildMemoryArtifacts(workspaceRoot);

  const artifacts: Artifact[] = [];
  let taskProgress: TaskProgress | undefined;
  for (const descriptor of descriptors) {
    const text = descriptor.kind === 'file' ? await readFileText(descriptor.uri) : null;
    if (descriptor.id === 'tasks' && text) {
      taskProgress = parseTaskProgress(text);
    }
    const status = await computeArtifactStatus(descriptor, text);
    const adjustments = await computeArtifactAdjustments(descriptor);
    artifacts.push({
      id: descriptor.id,
      label: descriptor.label,
      uri: descriptor.uri,
      kind: descriptor.kind,
      stepId: descriptor.stepId,
      status,
      adjustmentCount: adjustments.length,
      adjustments: adjustments.length > 0 ? adjustments : undefined,
    });
  }

  const elapsedMs = performance.now() - start;
  console.debug(`[SpecKit] Status snapshot (${artifacts.length} artifacts) in ${elapsedMs.toFixed(1)}ms`);

  return { branchContext, artifacts, taskProgress, initializationState };
}
