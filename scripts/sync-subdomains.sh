#!/usr/bin/env bash
# Sync subdomain DNS (Lightsail) and Caddy reverse proxy from config/subdomains.json.
#
# Usage:
#   ./scripts/sync-subdomains.sh            # DNS + Caddy
#   ./scripts/sync-subdomains.sh --dns-only
#   ./scripts/sync-subdomains.sh --caddy-only
#
# Requires default AWS CLI credentials (not utilio-s3). Set DRY_RUN=1 to preview.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/deploy-common.sh
source "$ROOT/scripts/lib/deploy-common.sh"
SCOPE="${1:---all}"

run_dns() {
  "$ROOT/scripts/sync-dns.sh" ensure
}

run_caddy() {
  "$ROOT/scripts/sync-caddy.sh"
}

case "$SCOPE" in
  --dns-only)
    run_dns
    ;;
  --caddy-only)
    run_caddy
    ;;
  --all|"")
    run_dns
    run_caddy
    ;;
  -h|--help)
    cat <<'HELP'
Usage: ./scripts/sync-subdomains.sh [--all|--dns-only|--caddy-only]

Reads config/subdomains.json and:
  1. Ensures DNS A records for each subdomain label (Route53 or Lightsail DNS)
  2. Regenerates /etc/caddy/Caddyfile on the Lightsail instance

Environment:
  DRY_RUN=1            Preview without AWS or SSH changes
  DEPLOY_HOST          Override SSH host (default: staticIp from config)
  LIGHTSAIL_SSH_KEY    Path to Lightsail .pem key (set in .env.deploy.local)
HELP
    ;;
  *)
    echo "Unknown option: $SCOPE" >&2
    exit 1
    ;;
esac

echo ""
echo "=== Subdomain sync complete ==="
deploy_common_load_config "$ROOT"
if [[ -n "${SUBDOMAIN_LABELS:-}" ]]; then
  for label in $SUBDOMAIN_LABELS; do
    echo "https://${label}.${SUBDOMAIN_APEX}"
  done
fi
