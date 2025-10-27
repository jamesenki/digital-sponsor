#!/usr/bin/env bash
set -euo pipefail

# Update or install ~/.claude content from jamesenki/dot-claude into this repo's .claude/
# - Uses GitHub ZIP download to avoid requiring git
# - Requires: curl, unzip, rsync
# - Idempotent: safe to re-run; preserves local edits by default (use --force to overwrite)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "${SCRIPT_DIR}/.." && pwd )"
TARGET_DIR="${REPO_ROOT}/.claude"
TMP_DIR="$(mktemp -d)"
ZIP_URL="https://github.com/jamesenki/dot-claude/archive/refs/heads/main.zip"
FORCE=false

usage() {
  cat <<EOF
Usage: tools/$(basename "$0") [--force]

Fetches https://github.com/jamesenki/dot-claude and syncs its contents into .claude/

Options:
  --force   Overwrite any local changes in .claude with upstream files

Notes:
- This script downloads a ZIP of the repo (no git required)
- Requires curl, unzip, and rsync to be installed
- By default, it will NOT overwrite local edits (rsync --ignore-existing)
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "${1:-}" == "--force" ]]; then
  FORCE=true
fi

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Error: missing dependency '$1'" >&2; exit 1; }
}

need_cmd curl
need_cmd unzip
need_cmd rsync

mkdir -p "$TARGET_DIR"

ZIP_FILE="$TMP_DIR/dot-claude.zip"
echo "Downloading dot-claude (main) ..."
curl -fsSL "$ZIP_URL" -o "$ZIP_FILE"

echo "Unpacking ..."
unzip -q "$ZIP_FILE" -d "$TMP_DIR"
SRC_DIR="$TMP_DIR/dot-claude-main"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "Error: expected directory not found: $SRC_DIR" >&2
  exit 1
fi

# Sync into .claude/
# Default: do NOT overwrite existing files (preserve local edits)
RSYNC_FLAGS=("-a" "--delete-excluded" "--exclude" ".git/" "--exclude" ".github/" "--exclude" "LICENSE" "--exclude" "README.md")
if [[ "$FORCE" == true ]]; then
  RSYNC_FLAGS+=("--delete")
else
  RSYNC_FLAGS+=("--ignore-existing")
fi

echo "Syncing into $TARGET_DIR ..."
rsync "${RSYNC_FLAGS[@]}" "$SRC_DIR/" "$TARGET_DIR/"

echo "Done. Files available under .claude/"

echo "TIP: to overwrite with upstream next time, run with --force"
