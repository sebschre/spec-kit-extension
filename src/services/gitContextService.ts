import * as vscode from 'vscode';
import { BranchContext } from '../models/statusModels';

type GitRepository = {
  rootUri: vscode.Uri;
  state: {
    HEAD?: {
      name?: string;
    };
    onDidChange?: vscode.Event<void>;
  };
};

type GitApi = {
  repositories: GitRepository[];
};

export type SpecFolder = {
  name: string;
  uri: vscode.Uri;
  mtime: number;
};

export type BranchContextResult = {
  branchContext: BranchContext;
  featureFolder: SpecFolder | null;
};

const GIT_EXTENSION_ID = 'vscode.git';

async function getGitApi(): Promise<GitApi | null> {
  const gitExtension = vscode.extensions.getExtension(GIT_EXTENSION_ID);
  if (!gitExtension) {
    return null;
  }

  const api = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
  if (!api?.getAPI) {
    return null;
  }

  return api.getAPI(1) as GitApi;
}

function pickRepository(api: GitApi, targetUri?: vscode.Uri): GitRepository | undefined {
  if (targetUri) {
    const match = api.repositories.find((repo) => targetUri.fsPath.startsWith(repo.rootUri.fsPath));
    if (match) {
      return match;
    }
  }

  return api.repositories[0];
}

export async function getCurrentBranchName(targetUri?: vscode.Uri): Promise<string | null> {
  const api = await getGitApi();
  if (!api || !api.repositories.length) {
    return null;
  }

  const repo = pickRepository(api, targetUri);
  return repo?.state.HEAD?.name ?? null;
}

export function resolveBranchContext(options: {
  branchName: string | null;
  specFolders: SpecFolder[];
}): BranchContextResult {
  const { branchName, specFolders } = options;
  const matches = branchName
    ? specFolders.filter((folder) => folder.name === branchName)
    : [];

  if (matches.length === 1) {
    return {
      branchContext: {
        branchName,
        featureFolderName: matches[0].name,
        matchStatus: 'matched',
      },
      featureFolder: matches[0],
    };
  }

  if (matches.length > 1) {
    return {
      branchContext: {
        branchName,
        featureFolderName: null,
        matchStatus: 'ambiguous',
      },
      featureFolder: null,
    };
  }

  return {
    branchContext: {
      branchName,
      featureFolderName: null,
      matchStatus: 'missing',
    },
    featureFolder: null,
  };
}

export async function getBranchContextForWorkspace(): Promise<BranchContextResult> {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  if (!workspaceFolders.length) {
    return {
      branchContext: {
        branchName: null,
        featureFolderName: null,
        matchStatus: 'missing',
      },
      featureFolder: null,
    };
  }

  const branchName = await getCurrentBranchName();
  const specFolders: SpecFolder[] = [];

  for (const folder of workspaceFolders) {
    const specsRoot = vscode.Uri.joinPath(folder.uri, 'specs');
    try {
      const entries = await vscode.workspace.fs.readDirectory(specsRoot);
      for (const [name, fileType] of entries) {
        if (fileType !== vscode.FileType.Directory) {
          continue;
        }
        const folderUri = vscode.Uri.joinPath(specsRoot, name);
        const stat = await vscode.workspace.fs.stat(folderUri);
        specFolders.push({ name, uri: folderUri, mtime: stat.mtime });
      }
    } catch {
      // ignore missing specs folders
    }
  }

  return resolveBranchContext({ branchName, specFolders });
}

export async function watchBranchChanges(options: {
  onDidChange: () => void;
  targetUri?: vscode.Uri;
}): Promise<vscode.Disposable | null> {
  const api = await getGitApi();
  if (!api || !api.repositories.length) {
    return null;
  }

  const repo = pickRepository(api, options.targetUri);
  if (!repo?.state.onDidChange) {
    return null;
  }

  let lastBranch = repo.state.HEAD?.name ?? null;
  return repo.state.onDidChange(() => {
    const nextBranch = repo.state.HEAD?.name ?? null;
    if (nextBranch !== lastBranch) {
      lastBranch = nextBranch;
      options.onDidChange();
    }
  });
}
