#!/usr/bin/env bash
# show-backlog.sh — deterministically render the canna-br card backlog in a
# right-hand cmux split. Falls back to inline render when not inside cmux.
#
# Trigger: invoked by the `backlog-board` skill when the user says
# "show backlog items" / "mostra o backlog" / etc. No improvisation — this
# script IS the behavior.
#
# Usage:
#   show-backlog.sh            # open a right cmux split running the board
#   show-backlog.sh --here     # render once in the current terminal (no split)
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOARD="$SCRIPT_DIR/board.py"
CMUX="${CMUX_BUNDLED_CLI_PATH:-/Applications/cmux.app/Contents/Resources/bin/cmux}"

render_inline() { clear 2>/dev/null || true; python3 "$BOARD"; }

# --here, or not inside cmux, or cmux CLI missing → inline render
if [ "${1:-}" = "--here" ] || [ -z "${CMUX_PANEL_ID:-}" ] || [ ! -x "$CMUX" ]; then
  render_inline
  exit 0
fi

# Open a right split (terminal) and capture its surface + workspace UUIDs.
out="$("$CMUX" new-pane --type terminal --direction right --focus true --id-format both 2>/dev/null)"
sfid="$(printf '%s' "$out" | grep -oE 'surface:[0-9]+ \([0-9A-Fa-f-]+\)' | grep -oE '\([0-9A-Fa-f-]+\)' | tr -d '()' | head -1)"
wsid="$(printf '%s' "$out" | grep -oE 'workspace:[0-9]+ \([0-9A-Fa-f-]+\)' | grep -oE '\([0-9A-Fa-f-]+\)' | tr -d '()' | head -1)"

# Could not resolve the new pane → fall back to inline so the user still sees it.
if [ -z "$sfid" ] || [ -z "$wsid" ]; then
  render_inline
  exit 0
fi

cmd="clear; python3 $BOARD"
"$CMUX" rpc surface.send_text "{\"workspace_id\":\"$wsid\",\"surface_id\":\"$sfid\",\"text\":\"$cmd\n\"}" >/dev/null 2>&1
# explicit Enter in case the embedded newline doesn't submit
"$CMUX" rpc surface.send_key  "{\"workspace_id\":\"$wsid\",\"surface_id\":\"$sfid\",\"key\":\"enter\"}" >/dev/null 2>&1

echo "backlog board opened in right cmux split (surface $sfid)"
