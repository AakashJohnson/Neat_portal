#!/usr/bin/env bash
# Publishes the three local repositories (nextjs-frontend, express-backend,
# migration-docs) to the GitHub monorepo, keeping each one's history under its
# own folder (git subtree), plus the CI workflow from migration-docs/ci.
#   tools/publish-monorepo.sh <work-dir> [remote-url]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${1:?work directory for the monorepo clone}"
REMOTE="${2:-https://github.com/AakashJohnson/Neat_portal}"

[ -d "$WORK/.git" ] || git clone -q "$REMOTE" "$WORK"
cd "$WORK"
git pull -q --ff-only origin main

for d in nextjs-frontend express-backend migration-docs; do
  if [ -d "$d" ]; then
    git subtree pull -q --prefix="$d" "$ROOT/$d" main -m "Update $d"
  else
    git subtree add -q --prefix="$d" "$ROOT/$d" main -m "Import $d with history"
  fi
done

mkdir -p .github/workflows
if ! cmp -s "$ROOT/migration-docs/ci/ci.yml" .github/workflows/ci.yml; then
  cp "$ROOT/migration-docs/ci/ci.yml" .github/workflows/ci.yml
  git add .github/workflows/ci.yml
  git commit -qm "CI workflow (from migration-docs/ci/ci.yml)"
fi

# Never publish secrets.
if git ls-files | grep -qE '(^|/)\.env(\.local)?$|\.pem$'; then
  echo "refusing to push: an env/key file is tracked" >&2
  exit 1
fi
git push -q origin main
git rev-parse --short HEAD
