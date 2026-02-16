import * as assert from 'assert';
import * as vscode from 'vscode';
import { registerBranchRefresh, WORKSPACE_WATCH_PATTERNS } from '../extension';
import { StatusViewProvider } from '../views/statusView';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('refreshes status on branch change', async () => {
		let refreshCount = 0;
		const provider = new StatusViewProvider(async () => ({
			branchContext: {
				branchName: '001-first',
				featureFolderName: '001-first',
				matchStatus: 'matched',
			},
			artifacts: [],
		}));
		const originalRefresh = provider.refresh.bind(provider);
		provider.refresh = async () => {
			refreshCount += 1;
			await originalRefresh();
		};

		let capturedCallback: (() => void) | undefined;
		const disposable = await registerBranchRefresh({
			statusViewProvider: provider,
			watchBranchChanges: async (options: { onDidChange: () => void; targetUri?: vscode.Uri }) => {
				capturedCallback = options.onDidChange;
				return { dispose: () => undefined } as vscode.Disposable;
			},
		});

		if (!capturedCallback) {
			throw new Error('capturedCallback is undefined');
		}
		await capturedCallback();
		assert.strictEqual(refreshCount, 1);
		disposable?.dispose();
	});

	test('excludes .github from workspace watchers', () => {
		const hasGithubPattern = WORKSPACE_WATCH_PATTERNS.some((pattern) =>
			pattern.startsWith('.github')
		);
		assert.strictEqual(hasGithubPattern, false);
	});
});
