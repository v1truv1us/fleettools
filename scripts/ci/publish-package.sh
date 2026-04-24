#!/usr/bin/env bash
# Publish a single package to npm, rewriting workspace:* deps first.
set -euo pipefail

package_dir="${1:?usage: publish-package.sh <package-dir> <dry-run>}"
dry_run="${2:-true}"

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$repo_root"

# Backup and restore package.json
package_json_path="$repo_root/$package_dir/package.json"
backup_path="$(mktemp)"
cp "$package_json_path" "$backup_path"

restore() { cp "$backup_path" "$package_json_path"; rm -f "$backup_path"; }
trap restore EXIT

package_name=$(node -p "require('./${package_dir}/package.json').name")
local_version=$(node -p "require('./${package_dir}/package.json').version")
published_version=$(npm view "$package_name" version 2>/dev/null || true)

echo "package=$package_name local=$local_version published=${published_version:-unpublished}"

if [[ -n "$published_version" && "$local_version" == "$published_version" ]]; then
  echo "Skipping $package_name (version already published)"
  exit 0
fi

# Rewrite workspace:* dependencies
bun scripts/rewrite-workspace-deps.ts "$package_dir"

# Build and pack
pushd "$package_dir" > /dev/null
bun run build

# Verify packed manifest has no workspace: specs
pack_output=$(npm pack --json)
pack_file=$(node -e "const p=JSON.parse(process.argv[1]);if(!p[0]?.filename)exit(1);process.stdout.write(p[0].filename)" "$pack_output")
if tar -xOf "$pack_file" package/package.json | grep -q 'workspace:'; then
  echo "ERROR: packed manifest contains workspace: deps"
  rm -f "$pack_file"
  exit 1
fi
rm -f "$pack_file"

# Publish
if [[ "$dry_run" == "true" ]]; then
  npm publish --dry-run --access public
else
  npm publish --access public
fi
popd > /dev/null

echo "Published $package_name@$local_version"