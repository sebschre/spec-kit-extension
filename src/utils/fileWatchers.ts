import * as vscode from 'vscode';

export interface FileWatcherOptions {
  onDidChange: () => void;
  debounceMs?: number;
  minIntervalMs?: number;
}

export class FileWatcherManager implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private debounceTimer: NodeJS.Timeout | undefined;
  private lastEmittedAt = 0;

  constructor(private readonly options: FileWatcherOptions) {}

  watchWorkspaceFolders(patterns: string[]): void {
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    if (!workspaceFolders.length) {
      return;
    }

    for (const folder of workspaceFolders) {
      for (const pattern of patterns) {
        const watcher = vscode.workspace.createFileSystemWatcher(
          new vscode.RelativePattern(folder, pattern)
        );

        watcher.onDidCreate(() => this.triggerChange());
        watcher.onDidChange(() => this.triggerChange());
        watcher.onDidDelete(() => this.triggerChange());

        this.disposables.push(watcher);
      }
    }
  }

  dispose(): void {
    this.clearTimer();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
  }

  private triggerChange(): void {
    this.clearTimer();
    const debounceMs = this.options.debounceMs ?? 300;
    const minIntervalMs = this.options.minIntervalMs ?? debounceMs;
    const now = Date.now();
    const timeSinceLastEmit = now - this.lastEmittedAt;
    const delay = Math.max(debounceMs, minIntervalMs - timeSinceLastEmit);

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      this.lastEmittedAt = Date.now();
      this.options.onDidChange();
    }, delay);
  }

  private clearTimer(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }
}
