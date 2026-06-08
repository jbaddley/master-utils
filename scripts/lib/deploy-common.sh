#!/usr/bin/env bash
# Shared helpers for Lightsail deploy and subdomain sync scripts.

deploy_common_root() {
  echo "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
}

deploy_common_load_config() {
  local root="${1:-$(deploy_common_root)}"
  SUBDOMAIN_CONFIG="${root}/config/subdomains.json"
  if [[ ! -f "$SUBDOMAIN_CONFIG" ]]; then
    echo "Missing config: $SUBDOMAIN_CONFIG" >&2
    return 1
  fi

  eval "$(python3 - "$SUBDOMAIN_CONFIG" <<'PY'
import json, shlex, sys
cfg = json.load(open(sys.argv[1]))
labels = " ".join(cfg.get("subdomains", {}))
dns = cfg.get("dns", {})
provider = shlex.quote(dns.get("provider", "route53"))
zone_id = shlex.quote(dns.get("hostedZoneId", ""))
print("export SUBDOMAIN_APEX=" + shlex.quote(cfg["apex"]))
print("export SUBDOMAIN_STATIC_IP=" + shlex.quote(cfg["staticIp"]))
print("export DNS_PROVIDER=" + provider)
print("export DNS_HOSTED_ZONE_ID=" + zone_id)
print("export LIGHTSAIL_INSTANCE=" + shlex.quote(cfg["lightsail"]["instance"]))
print("export LIGHTSAIL_REGION=" + shlex.quote(cfg["lightsail"]["region"]))
print("export SUBDOMAIN_LABELS=" + shlex.quote(labels))
PY
)"
  DEPLOY_HOST="${DEPLOY_HOST:-$SUBDOMAIN_STATIC_IP}"
}

aws_admin() {
  # CI saves admin creds to AWS_ADMIN_* before sourcing .env.deploy.local (utilio-s3).
  # Locally, unset utilio-s3 env vars and use the default ~/.aws profile instead.
  if [[ -n "${AWS_ADMIN_ACCESS_KEY_ID:-}" ]]; then
    AWS_ACCESS_KEY_ID="$AWS_ADMIN_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$AWS_ADMIN_SECRET_ACCESS_KEY" \
    aws "$@"
  else
    env -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_SESSION_TOKEN aws "$@"
  fi
}

deploy_common_setup_ssh() {
  local key="${LIGHTSAIL_SSH_KEY:-${DEPLOY_SSH_KEY:-}}"
  if [[ -n "$key" && -f "$key" ]]; then
    chmod 600 "$key" 2>/dev/null || true
    DEPLOY_SSH_KEY="$key"
    echo "▸ Using SSH key ${DEPLOY_SSH_KEY}"
    local ssh_opts=(
      -o StrictHostKeyChecking=no
      -o ServerAliveInterval=30
      -o ServerAliveCountMax=120
      -o TCPKeepAlive=yes
    )
    SSH=(ssh -i "$DEPLOY_SSH_KEY" "${ssh_opts[@]}")
    SCP=(scp -i "$DEPLOY_SSH_KEY" "${ssh_opts[@]}")
    return 0
  fi

  DEPLOY_SSH_DIR="$(mktemp -d)"
  DEPLOY_SSH_KEY="$DEPLOY_SSH_DIR/tempkey"
  trap 'rm -rf "$DEPLOY_SSH_DIR"' EXIT

  echo "▸ Fetching temporary Lightsail SSH certificate"
  ACCESS_JSON="$(aws_admin lightsail get-instance-access-details \
    --instance-name "$LIGHTSAIL_INSTANCE" \
    --region "$LIGHTSAIL_REGION" \
    --protocol ssh \
    --output json)"
  python3 - "$DEPLOY_SSH_DIR" "$ACCESS_JSON" <<'PY'
import json, os, stat, sys
ssh_dir, raw = sys.argv[1], sys.argv[2]
d = json.loads(raw)["accessDetails"]
priv = os.path.join(ssh_dir, "tempkey")
cert = os.path.join(ssh_dir, "tempkey-cert.pub")
open(priv, "w").write(d["privateKey"])
open(cert, "w").write(d["certKey"])
os.chmod(priv, stat.S_IRUSR | stat.S_IWUSR)
os.chmod(cert, stat.S_IRUSR | stat.S_IWUSR)
print(d.get("ipAddress") or "")
PY
  SSH=(ssh -i "$DEPLOY_SSH_KEY" -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=120 -o TCPKeepAlive=yes)
  SCP=(scp -i "$DEPLOY_SSH_KEY" -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=120 -o TCPKeepAlive=yes)
}
