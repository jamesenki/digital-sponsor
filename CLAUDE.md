# Claude Code Project Guidelines (local)

This project vendors shared Claude assets under `./.claude/` (sourced from
https://github.com/jamesenki/dot-claude).

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

# Digital Sponsor Rebuild Workflow Rules

## Development Workflow

After completing each atomic work task:

1. **Test** - Run all relevant tests (unit, integration, e2e as applicable)
2. **Commit** - Create a semantic commit with clear description
3. **Push** - Push changes to current branch
4. **CI/CD Orchestration** - Once GitHub Actions is set up, ensure:
   - Automated testing runs on push
   - Automated deployment to staging/production
   - Security scans and compliance checks
   - Performance testing where applicable

## Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <description>

<body>

🤖 Generated with Claude Code
```

Types: feat, fix, docs, style, refactor, test, chore, ci, build, perf Scopes: auth, chat, step-work,
literature, crisis, infrastructure, security

## Quality Gates

Each task must pass:

- All tests green ✅
- TypeScript compilation ✅
- ESLint with no errors ✅
- Security scan (when applicable) ✅
- Performance benchmarks (when applicable) ✅

## Azure DevOps Integration

Use GitHub Actions for:

- CI: Build, test, lint, security scan
- CD: Deploy to staging → production with approval gates
- Monitoring: Performance and security alerts
- Compliance: AA Traditions and GDPR validation

# Important Instruction Reminders

Do what has been asked; nothing more, nothing less. NEVER create files unless they're absolutely
necessary for achieving your goal. ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation
files if explicitly requested by the User.

# Azure Region Configuration

**CRITICAL**: All Azure deployments MUST use **Central US** region. Never deploy to East US or any
other region without explicit authorization.

- Primary region: `centralus`
- Backup region: `centraluseuap` (if needed)
- All container instances, app services, storage accounts, and other resources must be in Central US
