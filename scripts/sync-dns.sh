#!/usr/bin/env bash
# Create or update DNS A records for configured subdomains.
#
# Usage:
#   ./scripts/sync-dns.sh ensure   # upsert A records (default)
#   ./scripts/sync-dns.sh list     # show current A records
#   ./scripts/sync-dns.sh remove   # delete configured subdomain A records
#
# Provider is set in config/subdomains.json (route53 | lightsail).
# Route53 is used for utilio.solutions today; Lightsail DNS requires apex
# nameservers to point at the Lightsail zone (see lightsail path below).
#
# Set DRY_RUN=1 to preview without changes.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/deploy-common.sh
source "$ROOT/scripts/lib/deploy-common.sh"

ACTION="${1:-ensure}"
deploy_common_load_config "$ROOT"

LIGHTSAIL_DNS_REGION="us-east-1"

run_aws() {
  if [[ "${DRY_RUN:-}" == "1" ]]; then
    echo "[dry-run] aws $*"
    return 0
  fi
  aws_admin "$@"
}

ensure_route53_record() {
  local fqdn="$1"
  local batch
  batch="$(python3 - "$fqdn" "$SUBDOMAIN_STATIC_IP" "$DNS_HOSTED_ZONE_ID" <<'PY'
import json, sys
name, target, zone_id = sys.argv[1], sys.argv[2], sys.argv[3]
if not name.endswith("."):
    name += "."
print(json.dumps({
    "Comment": "sync-dns.sh subdomain upsert",
    "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
            "Name": name,
            "Type": "A",
            "TTL": 300,
            "ResourceRecords": [{"Value": target}],
        },
    }],
}))
PY
)"

  if [[ "${DRY_RUN:-}" == "1" ]]; then
    echo "▸ Would UPSERT ${fqdn} → ${SUBDOMAIN_STATIC_IP} (Route53 ${DNS_HOSTED_ZONE_ID})"
    return 0
  fi

  echo "▸ UPSERT ${fqdn} → ${SUBDOMAIN_STATIC_IP}"
  run_aws route53 change-resource-record-sets \
    --hosted-zone-id "$DNS_HOSTED_ZONE_ID" \
    --change-batch "$batch"
}

remove_route53_record() {
  local fqdn="$1"
  local existing
  existing="$(run_aws route53 list-resource-record-sets \
    --hosted-zone-id "$DNS_HOSTED_ZONE_ID" \
    --query "ResourceRecordSets[?Name=='${fqdn}.' && Type=='A'].ResourceRecords[0].Value | [0]" \
    --output text 2>/dev/null || true)"

  if [[ -z "$existing" || "$existing" == "None" ]]; then
    echo "▸ Skip ${fqdn} (no A record)"
    return 0
  fi

  local batch
  batch="$(python3 - "$fqdn" "$existing" <<'PY'
import json, sys
name, target = sys.argv[1], sys.argv[2]
if not name.endswith("."):
    name += "."
print(json.dumps({
    "Comment": "sync-dns.sh subdomain delete",
    "Changes": [{
        "Action": "DELETE",
        "ResourceRecordSet": {
            "Name": name,
            "Type": "A",
            "TTL": 300,
            "ResourceRecords": [{"Value": target}],
        },
    }],
}))
PY
)"

  if [[ "${DRY_RUN:-}" == "1" ]]; then
    echo "▸ Would DELETE ${fqdn} (was ${existing})"
    return 0
  fi

  echo "▸ DELETE ${fqdn}"
  run_aws route53 change-resource-record-sets \
    --hosted-zone-id "$DNS_HOSTED_ZONE_ID" \
    --change-batch "$batch"
}

list_route53_records() {
  echo "▸ Route53 zone: ${DNS_HOSTED_ZONE_ID} (${SUBDOMAIN_APEX})"
  run_aws route53 list-resource-record-sets \
    --hosted-zone-id "$DNS_HOSTED_ZONE_ID" \
    --query "ResourceRecordSets[?Type=='A'].[Name,ResourceRecords[0].Value]" \
    --output table
}

ensure_lightsail_domain_zone() {
  if run_aws lightsail get-domain --region "$LIGHTSAIL_DNS_REGION" --domain-name "$SUBDOMAIN_APEX" >/dev/null 2>&1; then
    echo "▸ Lightsail DNS zone exists: $SUBDOMAIN_APEX"
    return 0
  fi
  echo "▸ Creating Lightsail DNS zone: $SUBDOMAIN_APEX"
  run_aws lightsail create-domain --region "$LIGHTSAIL_DNS_REGION" --domain-name "$SUBDOMAIN_APEX"
}

lightsail_entry_target() {
  local fqdn="$1"
  run_aws lightsail get-domain \
    --region "$LIGHTSAIL_DNS_REGION" \
    --domain-name "$SUBDOMAIN_APEX" \
    --query "domain.domainEntries[?name=='${fqdn}' && type=='A'].target | [0]" \
    --output text 2>/dev/null || true
}

ensure_lightsail_record() {
  local label="$1"
  local fqdn="${label}.${SUBDOMAIN_APEX}"

  if [[ "${DRY_RUN:-}" == "1" ]]; then
    echo "▸ Would ensure ${fqdn} → ${SUBDOMAIN_STATIC_IP} (Lightsail DNS)"
    return 0
  fi

  local current
  current="$(lightsail_entry_target "$fqdn")"

  if [[ "$current" == "$SUBDOMAIN_STATIC_IP" ]]; then
    echo "▸ OK  ${fqdn} → ${SUBDOMAIN_STATIC_IP}"
    return 0
  fi

  if [[ -n "$current" && "$current" != "None" ]]; then
    echo "▸ Updating ${fqdn} (${current} → ${SUBDOMAIN_STATIC_IP})"
    run_aws lightsail delete-domain-entry \
      --region "$LIGHTSAIL_DNS_REGION" \
      --domain-name "$SUBDOMAIN_APEX" \
      --domain-entry "name=${fqdn},type=A,target=${current}"
  else
    echo "▸ Creating ${fqdn} → ${SUBDOMAIN_STATIC_IP}"
  fi

  run_aws lightsail create-domain-entry \
    --region "$LIGHTSAIL_DNS_REGION" \
    --domain-name "$SUBDOMAIN_APEX" \
    --domain-entry "name=${fqdn},type=A,target=${SUBDOMAIN_STATIC_IP},isAlias=false"
}

remove_lightsail_record() {
  local label="$1"
  local fqdn="${label}.${SUBDOMAIN_APEX}"
  local current
  current="$(lightsail_entry_target "$fqdn")"
  if [[ -z "$current" || "$current" == "None" ]]; then
    echo "▸ Skip ${fqdn} (no A record)"
    return 0
  fi
  echo "▸ Removing ${fqdn} (${current})"
  run_aws lightsail delete-domain-entry \
    --region "$LIGHTSAIL_DNS_REGION" \
    --domain-name "$SUBDOMAIN_APEX" \
    --domain-entry "name=${fqdn},type=A,target=${current}"
}

list_lightsail_records() {
  echo "▸ Lightsail DNS zone: $SUBDOMAIN_APEX"
  run_aws lightsail get-domain \
    --region "$LIGHTSAIL_DNS_REGION" \
    --domain-name "$SUBDOMAIN_APEX" \
    --query "domain.domainEntries[?type=='A'].[name,target]" \
    --output table
}

ensure_all() {
  case "$DNS_PROVIDER" in
    route53)
      [[ -n "$DNS_HOSTED_ZONE_ID" ]] || { echo "Missing dns.hostedZoneId in config" >&2; exit 1; }
      for label in $SUBDOMAIN_LABELS; do
        ensure_route53_record "${label}.${SUBDOMAIN_APEX}"
      done
      ;;
    lightsail)
      ensure_lightsail_domain_zone
      for label in $SUBDOMAIN_LABELS; do
        ensure_lightsail_record "$label"
      done
      ;;
    *)
      echo "Unknown dns.provider: $DNS_PROVIDER (use route53 or lightsail)" >&2
      exit 1
      ;;
  esac
}

remove_all() {
  for label in $SUBDOMAIN_LABELS; do
    case "$DNS_PROVIDER" in
      route53) remove_route53_record "${label}.${SUBDOMAIN_APEX}" ;;
      lightsail) remove_lightsail_record "$label" ;;
    esac
  done
}

list_all() {
  case "$DNS_PROVIDER" in
    route53) list_route53_records ;;
    lightsail) list_lightsail_records ;;
  esac
}

case "$ACTION" in
  ensure) ensure_all ;;
  list) list_all ;;
  remove) remove_all ;;
  *)
    echo "Usage: $0 {ensure|list|remove}" >&2
    exit 1
    ;;
esac
