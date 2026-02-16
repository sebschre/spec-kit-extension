# Spec Kit Extension

A VS Code extension that provides a native status view for spec-driven development. Track your workflow stages and documentation artifacts in real-time, automatically synced with your Git branches.

## Features

**Spec Kit adds a comprehensive status view for managing feature specifications:**

- **Workflow Status** shows past, current, and upcoming steps through a 5-stage development pipeline
- **Artifact Health** flags validated, complete, open-question, or missing documentation files with adjustment counts
- **Click any artifact** to open it directly in the editor
- **Recommendations** highlight the next workflow step based on missing artifacts
- **Git Integration** automatically matches your current branch to feature folders
- **Live Updates** watches for file changes and refreshes the view automatically
- **Branch Monitoring** detects branch switches and updates context in real-time

## Workflow Stages

Spec Kit tracks progress through five workflow stages:

1. **Constitution** (required) - Foundation and guidelines document
2. **Specify** (required) - Main feature specification
3. **Plan** (required) - Implementation plan and supporting research artifacts
4. **Tasks** (required) - Task breakdown and assignments
5. **Analyze** (required) - All artifacts are in a good state

Each stage shows one of these statuses:
- ✅ **Complete** - All required artifacts present with no open questions
- 🔵 **Current** - The stage actively being worked on
- ⚪ **Upcoming** - Stages not yet started
- ❌ **Blocked** - Missing prerequisites or dependencies

## Tracked Artifacts

Spec Kit monitors nine documentation artifacts for each feature:

| Artifact | Location | Purpose |
|----------|----------|---------|
| `constitution.md` | `.specify/memory/` | Shared guidelines across all features |
| `spec.md` | `specs/[branch-name]/` | Main feature specification |
| `plan.md` | `specs/[branch-name]/` | Implementation plan |
| `tasks.md` | `specs/[branch-name]/` | Task breakdown |
| `research.md` | `specs/[branch-name]/` | Research findings |
| `data-model.md` | `specs/[branch-name]/` | Data model definitions |
| `quickstart.md` | `specs/[branch-name]/` | Quick reference guide |
| `contracts/` | `specs/[branch-name]/` | Contract definitions (folder) |
| `checklists/requirements.md` | `specs/[branch-name]/` | Requirements validation |

### Artifact Status Indicators

Each artifact displays one of these statuses:

- ⚠️ **Missing** - File or folder doesn't exist
- 📝 **Open Questions** - Contains `TODO`, `TBD`, `NEEDS CLARIFICATION`, or placeholders like `[FEATURE NAME]`, `[DATE]`
- ✅ **Complete** - File exists with no open questions
- ✓ **Validated** - Associated checklist shows 100% completion

Artifacts also show an **adjustment count** with links to each detected location.

## Requirements

To use Spec Kit, your project needs:

1. **Git Repository** - The extension reads your current branch name
2. **Directory Structure** - Create these folders in your workspace:

```
your-project/
├── .specify/
│   └── memory/
│       └── constitution.md      # Shared guidelines
└── specs/
    └── [branch-name]/           # Named after your Git branch
        ├── spec.md
        ├── plan.md
        ├── tasks.md
        ├── research.md
        ├── data-model.md
        ├── quickstart.md
        ├── contracts/
        └── checklists/
            └── requirements.md
```

The extension automatically matches your current Git branch (e.g., `001-feature-name`) to the corresponding folder in `specs/001-feature-name/`.

## How It Works

1. **Branch Detection** - Reads your current Git branch name
2. **Folder Matching** - Looks for a matching folder in `specs/[branch-name]/`
3. **Status Computation** - Workflow uses artifact existence; adjustments are detected from content markers
4. **Real-time Updates** - Watches `.specify/**` and `specs/**` for changes
5. **View Refresh** - Automatically updates the status view when files change or branches switch

## Usage

1. Open the **Spec Kit Status** view in the Explorer sidebar
2. The view shows three sections:
    - **Workflow** - Progress through the 5 development stages
    - **Artifacts** - Status of all documentation files and adjustment counts
    - **Recommendation** - Next suggested step
3. Click any artifact to open it in the editor
4. The view updates automatically as you edit files

## Installation

Install from the Visual Studio Code Marketplace or build from source:

```bash
npm install
npm run package
```

Then install the generated `.vsix` file in VS Code.

## Known Issues

None currently. If you encounter any issues, please report them in the repository.

## Release Notes

### 0.0.2

Initial release of Spec Kit Extension

**Features:**
- 5-stage workflow tracking (Constitution → Specify → Plan → Tasks → Analyze)
- 9 documentation artifact monitoring with status indicators
- Git branch integration and automatic folder matching
- Real-time file watching for `.specify/**` and `specs/**`
- Click-to-open functionality for all artifacts
- Branch change detection and automatic view refresh
- Tree view in Explorer sidebar with collapsible sections

---


## License

This extension is licensed under the [MIT License]
