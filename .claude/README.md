# Local Claude assets (.claude/)

This folder holds reusable guidelines and commands from https://github.com/jamesenki/dot-claude for use with Claude Code across projects.

## How this is managed

We vendor the upstream repository into this project under `.claude/` so it works in any environment (including containers/CI) without relying on files in your home directory.

- Update script: `tools/update-dot-claude.sh`
- Upstream: https://github.com/jamesenki/dot-claude (branch: main)

### Update/refresh

Run the helper to fetch/refresh the latest upstream content into `.claude/`:

```bash
bash tools/update-dot-claude.sh       # safe: preserves your local edits
bash tools/update-dot-claude.sh --force  # overwrite with upstream (destructive)
```

Requires `curl`, `unzip`, and `rsync`.

## Using with Claude Code

Reference these files in your Claude prompts:

- Guidelines (examples)
  - `~/.claude/guidelines/shell-scripts.md`
  - `~/.claude/guidelines/shell-escaping.md`
  - `~/.claude/guidelines/convential-commits.md`
  - `~/.claude/guidelines/readme-documentation.md`
  - `~/.claude/guidelines/C4-diagramming.md`
- Commands
  - `~/.claude/commands/arch-review`
  - `~/.claude/commands/mine-sessions`

Because these are vendored inside this repo, use the project-relative path in local prompts, for example:

```
Please follow ./\.claude/guidelines/shell-scripts.md and ./\.claude/guidelines/shell-escaping.md for any bash code.
```

Tip: some scripts are executable tools (e.g., `arch-review`, `mine-sessions`). If you want to run them directly, mark them executable after fetching:

```bash
chmod +x .claude/commands/*
```

## Notes

- We intentionally exclude upstream `README.md` and `LICENSE` from sync into this folder to avoid confusing the project-level docs; see the update script if you want to include them.
- If upstream adds new files, re-run the update. If you’ve customized local copies, commit them to this repo.
