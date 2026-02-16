# Branch Artifact Status Fixture

This fixture provides a small workspace tree for branch-aware artifact tests.

Workspace root: src/test/fixtures/branch-artifact-status/workspace

Structure overview:
- specs/001-branch-artifact-status/ contains a full spec set.
- specs/002-other-feature/ contains a minimal spec to test non-matching branches.
- .specify/memory/ contains the constitution file.
- .github/agents and .github/prompts contain sample definitions for ignore tests.

Use this fixture by pointing tests at the workspace root and selecting a branch
name that matches or does not match the spec folder.
