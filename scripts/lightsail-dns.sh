#!/usr/bin/env bash
# Back-compat wrapper — prefer ./scripts/sync-dns.sh
exec "$(cd "$(dirname "$0")" && pwd)/sync-dns.sh" "$@"
