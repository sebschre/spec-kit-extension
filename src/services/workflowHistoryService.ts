import * as vscode from 'vscode';

export type WorkflowHistoryContext = Pick<vscode.ExtensionContext, 'storageUri' | 'workspaceState'>;

export type WorkflowHistorySource = 'session-log' | 'artifact-fallback';

export interface WorkflowHistoryEvent {
  id: string;
  branchKey: string;
  type: string;
  stepId: string;
  label: string;
  timestamp: string;
  source: WorkflowHistorySource | string;
}

export interface WorkflowHistoryLog {
  branchKey: string;
  events: WorkflowHistoryEvent[];
  lastUpdated: string;
}

const TEXT_DECODER = new TextDecoder('utf-8');
const TEXT_ENCODER = new TextEncoder();
const HISTORY_DIRECTORY = 'workflow-history';
const HISTORY_INDEX_PREFIX = 'specKit.workflowHistory.lastUpdated.';
const DUPLICATE_WINDOW_MS = 60 * 1000;

export function buildBranchKey(options: {
  branchName: string | null;
  workspaceRoot: vscode.Uri | null;
}): string | null {
  const { branchName, workspaceRoot } = options;
  if (!branchName || !workspaceRoot) {
    return null;
  }

  return `${workspaceRoot.fsPath}:${branchName}`;
}

function sanitizeBranchKey(branchKey: string): string {
  return encodeURIComponent(branchKey).replace(/%/g, '_');
}

function getHistoryFileUri(context: WorkflowHistoryContext, branchKey: string): vscode.Uri | null {
  if (!context.storageUri) {
    return null;
  }

  const fileName = `${sanitizeBranchKey(branchKey)}.json`;
  return vscode.Uri.joinPath(context.storageUri, HISTORY_DIRECTORY, fileName);
}

function shouldAppendEvent(existingEvents: WorkflowHistoryEvent[], candidate: WorkflowHistoryEvent): boolean {
  const last = existingEvents[existingEvents.length - 1];
  if (!last) {
    return true;
  }

  if (last.type === candidate.type && last.stepId === candidate.stepId && last.source === candidate.source) {
    const lastTime = Date.parse(last.timestamp);
    const nextTime = Date.parse(candidate.timestamp);
    if (!Number.isNaN(lastTime) && !Number.isNaN(nextTime)) {
      return nextTime - lastTime > DUPLICATE_WINDOW_MS;
    }
  }

  return true;
}

export async function readWorkflowHistory(
  context: WorkflowHistoryContext,
  branchKey: string
): Promise<WorkflowHistoryLog | null> {
  const fileUri = getHistoryFileUri(context, branchKey);
  if (!fileUri) {
    return null;
  }

  try {
    const data = await vscode.workspace.fs.readFile(fileUri);
    const raw = TEXT_DECODER.decode(data);
    const parsed = JSON.parse(raw) as WorkflowHistoryLog | null;
    if (!parsed || parsed.branchKey !== branchKey || !Array.isArray(parsed.events)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeWorkflowHistory(context: WorkflowHistoryContext, log: WorkflowHistoryLog): Promise<void> {
  const fileUri = getHistoryFileUri(context, log.branchKey);
  if (!fileUri) {
    return;
  }

  if (!context.storageUri) {
    return;
  }

  const historyRoot = vscode.Uri.joinPath(context.storageUri, HISTORY_DIRECTORY);
  await vscode.workspace.fs.createDirectory(historyRoot);
  const payload = JSON.stringify(log, null, 2);
  await vscode.workspace.fs.writeFile(fileUri, TEXT_ENCODER.encode(payload));
  await context.workspaceState.update(`${HISTORY_INDEX_PREFIX}${log.branchKey}`, log.lastUpdated);
}

export async function appendWorkflowEvents(
  context: WorkflowHistoryContext,
  branchKey: string,
  events: WorkflowHistoryEvent[]
): Promise<WorkflowHistoryLog | null> {
  if (!context.storageUri || events.length === 0) {
    return null;
  }

  const existing = (await readWorkflowHistory(context, branchKey)) ?? {
    branchKey,
    events: [],
    lastUpdated: new Date().toISOString(),
  };

  const nextEvents = [...existing.events];
  for (const event of events) {
    if (shouldAppendEvent(nextEvents, event)) {
      nextEvents.push(event);
    }
  }

  nextEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const updatedLog: WorkflowHistoryLog = {
    branchKey,
    events: nextEvents,
    lastUpdated: new Date().toISOString(),
  };

  await writeWorkflowHistory(context, updatedLog);
  return updatedLog;
}
