# Claude Code Project Guidelines (local)

This project vendors shared Claude assets under `./.claude/` (sourced from https://github.com/jamesenki/dot-claude).

## Usage in prompts

When asking Claude to write code or docs, reference these guidelines:

- `./.claude/guidelines/shell-scripts.md`
- `./.claude/guidelines/shell-escaping.md`
- `./.claude/guidelines/convential-commits.md`
- `./.claude/guidelines/readme-documentation.md`
- `./.claude/guidelines/C4-diagramming.md`

Example:

```
Please follow the repository-local guidelines:
- ./.claude/guidelines/shell-scripts.md for any bash
- ./.claude/guidelines/shell-escaping.md for shell escaping
- ./.claude/guidelines/convential-commits.md for git commits
- ./.claude/guidelines/readme-documentation.md for documentation structure
```

## Commands

After syncing `.claude/` (see below), you’ll have scripts like:

- `./.claude/commands/arch-review` — generate an architecture review
- `./.claude/commands/mine-sessions` — mine session logs

Mark scripts executable to run them:

```bash
chmod +x .claude/commands/*
```

## Update the vendored assets

Use the helper to download the latest upstream guidelines and commands into `./.claude/`:

```bash
bash tools/update-dot-claude.sh       # preserve local edits
bash tools/update-dot-claude.sh --force  # overwrite with upstream
```

If upstream adds new files, rerun the script to pull them in.
