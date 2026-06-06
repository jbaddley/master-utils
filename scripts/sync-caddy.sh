#!/usr/bin/env bash
# Push generated Caddyfile to the Lightsail instance and reload Caddy.
#
# Usage:
#   ./scripts/sync-caddy.sh
#
# Set DRY_RUN=1 to print the Caddyfile without SSH changes.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/deploy-common.sh
source "$ROOT/scripts/lib/deploy-common.sh"

deploy_common_load_config "$ROOT"

CADDYFILE="$("$ROOT/scripts/generate-caddyfile.sh")"

if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "$CADDYFILE"
  exit 0
fi

deploy_common_setup_ssh
echo "▸ Updating Caddy on ${DEPLOY_HOST} (${LIGHTSAIL_INSTANCE})"
printf '%s\n' "$CADDYFILE" | "${SSH[@]}" "ubuntu@$DEPLOY_HOST" "sudo tee /etc/caddy/Caddyfile >/dev/null"
"${SSH[@]}" "ubuntu@$DEPLOY_HOST" bash <<'REMOTE'
set -e
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
REMOTE

echo "▸ Caddy reloaded"
