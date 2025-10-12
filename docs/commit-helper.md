# Commit Helper Script

This repository includes `scripts/commit-helper.js` to help automation agents (including LLM-based
assistants) inspect the working tree, prepare Conventional Commits, and push to the current branch.

## Prerequisites

- Node.js 18+ available on the PATH.
- Run the script from the repository root.

> The script calls Git directly, so make sure Git is installed and the current branch is the one you
> want to update.

## Preview pending changes

Use preview mode to gather the full diff and status before drafting commit messages (this is also the
default when no arguments are provided):

```bash
node ./scripts/commit-helper.js --preview
# or simply:
node ./scripts/commit-helper.js
```

Preview mode prints:

- `git status --short --branch`
- The staged diff (`git diff --cached`)
- The working tree diff (`git diff`)
- Untracked files (`git ls-files --others --exclude-standard`)

This output gives an LLM all the context it needs to draft grouped commit summaries.

## Describe commits with a plan file

Once the changes are grouped, create a JSON plan describing the commits. The script expects an array
of entries, in chronological order:

```json
[
  {
    "title": "feat(ui): add spinner helper",
    "body": [
      "Render the spinner ring correctly while preserving accessibility labels.",
      "Covers the regression where the login button showed a white square."
    ],
    "paths": [
      "packages/ui/src/components/Spinner/Spinner.tsx"
    ]
  },
  {
    "title": "docs: note commit helper workflow",
    "paths": [
      "docs/commit-helper.md"
    ]
  }
]
```

- `title` (required): Conventional Commit summary line.
- `body` (optional): Array or string with additional lines added beneath the summary.
- `paths` (required): Array of paths to stage for the commit. Use `"all"` to stage the entire tree
  for a single commit.

> Keep commits meaningful, not tiny. If a set of related changes fits comfortably into one commit,
> prefer grouping them together and capture the detail in descriptive bullets in the `body`.

## Create commits and push

Run the script with the plan file to generate commits and push to the current branch:

```bash
node ./scripts/commit-helper.js --plan-file plan.json
```

The script will:

1. Ensure the staging area is clean.
2. Apply each plan entry in order (unstaging between commits to avoid cross-contamination).
3. Build the commit message from `title` and `body`.
4. Push to `origin/<current-branch>` when finished.

### Dry run

Set `--dry-run` to preview the Git commands without mutating the repository:

```bash
node ./scripts/commit-helper.js --plan-file plan.json --dry-run
```

### Skip the push step

Set `--skip-push` to leave the commits local:

```bash
node ./scripts/commit-helper.js --plan-file plan.json --skip-push
```

### Use a different remote

Provide `--remote upstream` (or any remote name) to push somewhere other than `origin`:

```bash
node ./scripts/commit-helper.js --plan-file plan.json --remote upstream
```

## Recommended flow for automation agents

1. `--preview` (or run without arguments) to gather status, diffs, and untracked files.
2. Draft commit groupings and messages based on the output.
3. Save the plan JSON (e.g., `.tmp/commit-plan.json`).
4. Optionally invoke the script with `--dry-run` to make sure staging resolves correctly.
5. Run the script without `--dry-run` to apply commits and push.
6. Inspect the post-push status if needed.

Following this workflow keeps commits clean, chronological, and ready for review.
