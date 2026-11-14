#!/usr/bin/env bash
# Local Antigravity run of the deep enrichment pass. Needs `agy` logged in on
# this machine (the CLI uses an interactive Google login, so this cannot run in CI).
# Works in a throwaway worktree off origin/main, then opens a data-only PR that
# auto-merge-jules.yml merges once CI passes.
#
#   scripts/agy-enrich-local.sh [limit]      default limit 5
set -euo pipefail

LIMIT="${1:-5}"
REPO="$(git rev-parse --show-toplevel)"
BRANCH="data/agy-enrich-$(date -u +%Y%m%d-%H%M)"
WT="$(mktemp -d)/reporadar-agy"

cleanup() { git -C "$REPO" worktree remove --force "$WT" 2>/dev/null || true; }
trap cleanup EXIT

git -C "$REPO" fetch -q origin main
git -C "$REPO" worktree add -q -b "$BRANCH" "$WT" origin/main
cd "$WT"

node scripts/deep-enrich.mjs --provider agy --limit "$LIMIT"

git add data
if git diff --cached --quiet; then
  echo "Nothing to enrich; no PR opened"
  git -C "$REPO" branch -q -D "$BRANCH"
  exit 0
fi

git commit -q -m "data: Antigravity deep enrichment ($(git diff --cached --name-only | wc -l | tr -d ' ') repos)"
git push -q -u origin "$BRANCH"
gh pr create --base main --head "$BRANCH" \
  --title "Enrich repository AI summaries (Antigravity)" \
  --body "Deep aiSummary pass from scripts/deep-enrich.mjs (provider: agy). Touches data/repos only."
