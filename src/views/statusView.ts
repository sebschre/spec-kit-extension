import * as vscode from 'vscode';
import {
  Adjustment,
  Artifact,
  BranchContext,
  InitializationState,
  Recommendation,
  StatusSnapshot,
  WorkflowStep,
} from '../models/statusModels';
import { computeRecommendation, computeWorkflowSteps } from '../services/workflowStatusService';

const STATUS_LABELS: Record<string, string> = {
  complete: 'Complete',
  current: 'Current',
  upcoming: 'Upcoming',
  incomplete: 'Incomplete',
  validated: 'Validated',
  'open-questions': 'Open Questions',
  missing: 'Missing',
};

const STATUS_ICONS: Record<string, vscode.ThemeIcon> = {
  complete: new vscode.ThemeIcon('check'),
  current: new vscode.ThemeIcon('circle-filled'),
  upcoming: new vscode.ThemeIcon('circle-outline'),
  incomplete: new vscode.ThemeIcon('error'),
  validated: new vscode.ThemeIcon('verified'),
  'open-questions': new vscode.ThemeIcon('warning'),
  missing: new vscode.ThemeIcon('circle-slash'),
};

export type StatusProvider = () => Promise<StatusSnapshot>;

class StatusTreeItem extends vscode.TreeItem {
  readonly data?: Artifact | Adjustment;

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    options: {
      description?: string;
      icon?: vscode.ThemeIcon;
      tooltip?: string;
      contextValue?: string;
      command?: vscode.Command;
      data?: Artifact | Adjustment;
    } = {}
  ) {
    super(label, collapsibleState);
    this.description = options.description;
    this.tooltip = options.tooltip;
    this.iconPath = options.icon;
    this.contextValue = options.contextValue;
    this.command = options.command;
    this.data = options.data;
  }
}

export class StatusViewProvider implements vscode.TreeDataProvider<StatusTreeItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<StatusTreeItem | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private workflow: WorkflowStep[] = [];
  private artifacts: Artifact[] = [];
  private recommendation: Recommendation | null = null;
  private initializationState: InitializationState | undefined;
  private branchContext: BranchContext = {
    branchName: null,
    featureFolderName: null,
    matchStatus: 'missing',
  };

  constructor(private readonly getStatus: StatusProvider) {}

  async refresh(): Promise<void> {
    const snapshot = await this.getStatus();
    this.artifacts = snapshot.artifacts;
    this.branchContext = snapshot.branchContext;
    this.initializationState = snapshot.initializationState;
    const taskProgress = snapshot.taskProgress;

    if (this.initializationState && !this.initializationState.initialized) {
      this.workflow = [];
      this.artifacts = [];
      this.recommendation = null;
    } else {
      this.workflow = snapshot.workflow
        ?? computeWorkflowSteps(this.artifacts, this.branchContext, taskProgress);
      const implementStep = this.workflow.find((step) => step.id === 'implement');
      this.recommendation = snapshot.recommendation
        ?? computeRecommendation(this.artifacts, implementStep?.progress ?? taskProgress);
    }
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  getTreeItem(element: StatusTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: StatusTreeItem): Promise<StatusTreeItem[]> {
    if (!element) {
      if (this.initializationState && !this.initializationState.initialized) {
        return [
          new StatusTreeItem(this.initializationState.message ?? 'spec-kit not initialized',
            vscode.TreeItemCollapsibleState.None, {
              contextValue: 'status-uninitialized',
              icon: new vscode.ThemeIcon('info'),
            }
          ),
        ];
      }

      return [
        new StatusTreeItem('Workflow', vscode.TreeItemCollapsibleState.Expanded, {
          contextValue: 'section-workflow',
        }),
        new StatusTreeItem('Spec Artifacts', vscode.TreeItemCollapsibleState.Expanded, {
          contextValue: 'section-artifacts',
        }),
        new StatusTreeItem('Recommendation', vscode.TreeItemCollapsibleState.Expanded, {
          contextValue: 'section-recommendation',
        }),
      ];
    }

    if (element.contextValue === 'section-workflow') {
      return this.workflow.map((step) => this.toWorkflowItem(step));
    }

    if (element.contextValue === 'section-artifacts') {
      if (!this.artifacts.length && this.branchContext.matchStatus !== 'matched') {
        let description = 'No matching feature folder';
        if (this.branchContext.matchStatus === 'ambiguous') {
          description = 'Multiple matching feature folders';
        } else if (!this.branchContext.branchName) {
          description = 'No active git branch';
        }

        return [
          new StatusTreeItem('No artifacts available', vscode.TreeItemCollapsibleState.None, {
            description,
            icon: STATUS_ICONS.missing,
          }),
        ];
      }

      return this.artifacts.map((artifact) => this.toArtifactItem(artifact));
    }

    if (element.contextValue === 'section-recommendation') {
      return [this.toRecommendationItem()];
    }

    if (element.contextValue === 'artifact-item') {
      const artifact = element.data as Artifact | undefined;
      if (!artifact?.adjustments?.length) {
        return [];
      }

      return artifact.adjustments.map((adjustment) => this.toAdjustmentItem(adjustment));
    }

    return [];
  }

  private toWorkflowItem(step: WorkflowStep): StatusTreeItem {
    const statusLabel = STATUS_LABELS[step.status] ?? step.status;
    let description = step.optional ? `${statusLabel} · optional` : statusLabel;
    if (step.id === 'implement' && step.progress) {
      description = `${description} · ${step.progress.text} ${step.progress.bar}`;
    }
    return new StatusTreeItem(step.label, vscode.TreeItemCollapsibleState.None, {
      description,
      tooltip: `${step.label} - ${description}`,
      icon: STATUS_ICONS[step.status],
    });
  }

  private toArtifactItem(artifact: Artifact): StatusTreeItem {
    const statusLabel = STATUS_LABELS[artifact.status] ?? artifact.status;
    const adjustmentLabel = `${artifact.adjustmentCount} adjustment${artifact.adjustmentCount === 1 ? '' : 's'}`;
    const description = `${statusLabel} · ${adjustmentLabel}`;
    const collapsibleState = artifact.adjustmentCount > 0
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;
    return new StatusTreeItem(artifact.label, collapsibleState, {
      description,
      tooltip: `${artifact.label} - ${description}`,
      icon: STATUS_ICONS[artifact.status],
      contextValue: 'artifact-item',
      command: {
        command: 'specKit.openArtifact',
        title: 'Open Artifact',
        arguments: [artifact],
      },
      data: artifact,
    });
  }

  private toAdjustmentItem(adjustment: Adjustment): StatusTreeItem {
    const locationLabel = adjustment.line
      ? `Line ${adjustment.line}${adjustment.column ? `, Col ${adjustment.column}` : ''}`
      : 'Location unavailable';
    return new StatusTreeItem(adjustment.label, vscode.TreeItemCollapsibleState.None, {
      description: locationLabel,
      tooltip: `${adjustment.label} - ${locationLabel}`,
      icon: new vscode.ThemeIcon('arrow-right'),
      contextValue: 'artifact-adjustment',
      command: {
        command: 'specKit.openAdjustment',
        title: 'Open Adjustment',
        arguments: [adjustment],
      },
      data: adjustment,
    });
  }

  private toRecommendationItem(): StatusTreeItem {
    if (!this.recommendation) {
      if (this.isFeatureComplete()) {
        const description = 'Feature complete';
        return new StatusTreeItem('Feature complete', vscode.TreeItemCollapsibleState.None, {
          description,
          tooltip: description,
          icon: new vscode.ThemeIcon('check'),
        });
      }

      const description = this.artifacts.length ? 'All steps complete' : 'No artifacts available';
      return new StatusTreeItem('No recommendation', vscode.TreeItemCollapsibleState.None, {
        description,
        tooltip: description,
        icon: new vscode.ThemeIcon('info'),
      });
    }

    const { stepLabel, artifactLabel, reason } = this.recommendation;
    return new StatusTreeItem(`Next: ${stepLabel}`, vscode.TreeItemCollapsibleState.None, {
      description: artifactLabel,
      tooltip: `${stepLabel} - ${artifactLabel} (${reason})`,
      icon: new vscode.ThemeIcon('lightbulb'),
    });
  }

  private isFeatureComplete(): boolean {
    const implementStep = this.workflow.find((step) => step.id === 'implement');
    const progress = implementStep?.progress;
    return Boolean(progress && progress.total > 0 && progress.completed >= progress.total);
  }
}
