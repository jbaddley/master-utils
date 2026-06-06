#!/usr/bin/env bash
# Print a Caddyfile for apex + configured subdomains (stdout).
#
# Usage:
#   ./scripts/generate-caddyfile.sh > /tmp/Caddyfile

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="${ROOT}/config/subdomains.json"

python3 - "$CONFIG" <<'PY'
import json, sys

cfg = json.load(open(sys.argv[1]))
apex = cfg["apex"]
hosts = [apex, f"www.{apex}"]
for label in cfg.get("subdomains", {}):
    hosts.append(f"{label}.{apex}")

host_list = ", ".join(hosts)
snippet = """\tencode gzip
\theader {
\t\tCross-Origin-Opener-Policy "same-origin"
\t\tCross-Origin-Embedder-Policy "require-corp"
\t}
\treverse_proxy 127.0.0.1:3000 {
\t\theader_up Host {host}
\t\theader_up X-Forwarded-Host {host}
\t\theader_up X-Forwarded-Proto {scheme}
\t}"""

print(f"# Generated from config/subdomains.json — do not edit on server by hand.")
print(f"{host_list} {{")
print(snippet)
print("}")
PY
