// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getStatusSnapshot } from './services/artifactStatusService';
import { Adjustment, Artifact } from './models/statusModels';
import { FileWatcherManager } from './utils/fileWatchers';
import { StatusViewProvider } from './views/statusView';
import { watchBranchChanges } from './services/gitContextService';

type BranchRefreshOptions = {
	statusViewProvider: StatusViewProvider;
	watchBranchChanges?: typeof watchBranchChanges;
};

export const WORKSPACE_WATCH_PATTERNS = ['.specify/**', 'specs/**'];

export async function registerBranchRefresh(
	options: BranchRefreshOptions
): Promise<vscode.Disposable | null> {
	const watch = options.watchBranchChanges ?? watchBranchChanges;
	return watch({
		onDidChange: () => {
			void options.statusViewProvider.refresh();
		},
	});
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const statusViewProvider = new StatusViewProvider(getStatusSnapshot);
	const watcherManager = new FileWatcherManager({
		onDidChange: () => statusViewProvider.refresh(),
		debounceMs: 300,
		minIntervalMs: 250,
	});

	watcherManager.watchWorkspaceFolders(WORKSPACE_WATCH_PATTERNS);

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('specKit.status', statusViewProvider),
		watcherManager,
		vscode.commands.registerCommand('specKit.openArtifact', async (artifact?: Artifact) => {
			if (!artifact) {
				return;
			}

			if (artifact.kind === 'folder') {
				await vscode.commands.executeCommand('revealInExplorer', artifact.uri);
				return;
			}

			const document = await vscode.workspace.openTextDocument(artifact.uri);
			await vscode.window.showTextDocument(document, { preview: true });
		}),
		vscode.commands.registerCommand('specKit.openAdjustment', async (adjustment?: Adjustment) => {
			if (!adjustment) {
				return;
			}

			const document = await vscode.workspace.openTextDocument(adjustment.filePath);
			const editor = await vscode.window.showTextDocument(document, { preview: true });
			if (adjustment.line) {
				const lineIndex = Math.max(0, adjustment.line - 1);
				const columnIndex = Math.max(0, (adjustment.column ?? 1) - 1);
				const position = new vscode.Position(lineIndex, columnIndex);
				editor.selection = new vscode.Selection(position, position);
				editor.revealRange(new vscode.Range(position, position));
			}
		})
	);

	void registerBranchRefresh({ statusViewProvider }).then((disposable) => {
		if (disposable) {
			context.subscriptions.push(disposable);
		}
	});

	void statusViewProvider.refresh();
}

// This method is called when your extension is deactivated
export function deactivate() {}
