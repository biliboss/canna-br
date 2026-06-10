#!/bin/sh
# seed-tool-servers.sh — POSIX wrapper around `seed-tool-servers.ts`.
#
# Loads `.env` from `ops/openwebui/.env` (or `$ENV_FILE` if set), exports the
# OWUI_* / MCP_* vars, and invokes the TypeScript seeder.
#
# Designed to run as a Kamal v2 `post-deploy` hook OR ad-hoc:
#
#   kamal hook post-deploy ./ops/openwebui/scripts/seed-tool-servers.sh
#   sh ops/openwebui/scripts/seed-tool-servers.sh
#
# Requires Node.js >= 22.6 (for `--experimental-strip-types`) OR Node 20+ with
# `tsx` available on PATH (auto-detected).
#
# Exit code: forwards from the TS script (0 = ok, 1 = failed).

set -eu

SCRIPT_DIR="$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)"
OPS_DIR="$(CDPATH='' cd -- "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ENV_FILE:-${OPS_DIR}/.env}"

# Load .env if present. We deliberately avoid `set -a` so blank/comment lines
# in `.env` don't blow up — manual parse, only export `KEY=VALUE` pairs.
if [ -f "${ENV_FILE}" ]; then
  while IFS= read -r line || [ -n "${line}" ]; do
    case "${line}" in
      ''|\#*) continue ;;
      *=*)
        key="${line%%=*}"
        val="${line#*=}"
        # strip surrounding single or double quotes
        case "${val}" in
          \"*\") val="${val#\"}"; val="${val%\"}" ;;
          \'*\') val="${val#\'}"; val="${val%\'}" ;;
        esac
        export "${key}=${val}"
        ;;
    esac
  done < "${ENV_FILE}"
fi

TS_FILE="${SCRIPT_DIR}/seed-tool-servers.ts"

if [ ! -f "${TS_FILE}" ]; then
  printf '{"status":"failed","error":"seed-tool-servers.ts not found at %s"}\n' "${TS_FILE}" >&2
  exit 1
fi

# Prefer Node native TS stripping (Node 22.6+) — fall back to tsx if available.
if node --experimental-strip-types --version >/dev/null 2>&1; then
  exec node --experimental-strip-types --no-warnings "${TS_FILE}"
elif command -v tsx >/dev/null 2>&1; then
  exec tsx "${TS_FILE}"
elif command -v pnpm >/dev/null 2>&1 && pnpm dlx --help >/dev/null 2>&1; then
  exec pnpm dlx tsx "${TS_FILE}"
else
  printf '{"status":"failed","error":"need Node >=22.6 (strip-types) or tsx on PATH"}\n' >&2
  exit 1
fi
