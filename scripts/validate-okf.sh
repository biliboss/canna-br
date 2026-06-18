#!/usr/bin/env bash
# validate-okf.sh — OKF (Open Knowledge Format v0.1) conformance gate.
#
# Checks the bundle at apps/docs/okf/ (override via $1 or $OKF_DIR) against the
# three OKF conformance rules, plus LLM-legibility warnings (cb-w12 Camada OKF):
#
#   E1  every .md has a parseable YAML frontmatter block (--- ... ---)
#   E2  every frontmatter declares a non-empty `type:`
#   E3  reserved files index.md + log.md exist and carry their structural keys
#       (index.md → type:index + okf_version; log.md → type:log)
#
#   W   warn (non-fatal) when title/description absent, or when a concept note
#       is an orphan: no outbound Markdown link AND not referenced by index.md
#       (context-engineering: the bundle must form a connected graph, no órfãos).
#
# No external deps — pure bash + grep/sed. Exit != 0 on any E1/E2/E3 violation.
# Plugged into lefthook pre-push (gate 07-okf). See apps/docs/okf/index.md.

set -uo pipefail

OKF_DIR="${1:-${OKF_DIR:-apps/docs/okf}}"

# Resolve relative to repo root so it works from a git hook (cwd = repo root).
if [ ! -d "$OKF_DIR" ]; then
  echo "✗ OKF: bundle dir não encontrado: $OKF_DIR" >&2
  exit 1
fi

errors=0
warnings=0

# Extract the frontmatter block (between the first two '---' lines).
frontmatter() {
  awk 'NR==1 && $0=="---"{f=1;next} f&&$0=="---"{exit} f{print}' "$1"
}

# Value of a top-level YAML key in a frontmatter block (best-effort, no nesting).
fm_value() {
  printf '%s\n' "$1" | sed -n "s/^$2:[[:space:]]*//p" | head -1 | sed 's/^["'"'"']//; s/["'"'"']$//; s/[[:space:]]*$//'
}

# 3.2-compatible file collection (no mapfile/globstar on macOS bash 3.2).
files=()
while IFS= read -r _f; do
  files+=("$_f")
done < <(find "$OKF_DIR" -name '*.md' | sort)

if [ "${#files[@]}" -eq 0 ]; then
  echo "✗ OKF: nenhum .md no bundle $OKF_DIR" >&2
  exit 1
fi

index_md="$OKF_DIR/index.md"
log_md="$OKF_DIR/log.md"
index_body=""
[ -f "$index_md" ] && index_body="$(cat "$index_md")"

for f in "${files[@]}"; do
  rel="${f#"$OKF_DIR"/}"
  fm="$(frontmatter "$f")"

  # E1 — parseable frontmatter block present.
  if [ -z "$fm" ]; then
    echo "✗ E1 $rel — sem frontmatter YAML parseável (--- ... ---)" >&2
    errors=$((errors + 1))
    continue
  fi

  # E2 — non-empty type.
  type_val="$(fm_value "$fm" type)"
  if [ -z "$type_val" ]; then
    echo "✗ E2 $rel — frontmatter sem 'type' não-vazio" >&2
    errors=$((errors + 1))
  fi

  # W — title/description recommended.
  [ -z "$(fm_value "$fm" title)" ]       && { echo "⚠ W  $rel — sem 'title'" >&2; warnings=$((warnings + 1)); }
  [ -z "$(fm_value "$fm" description)" ] && { echo "⚠ W  $rel — sem 'description'" >&2; warnings=$((warnings + 1)); }

  # W — orphan check (skip reserved files). A concept is connected if it has an
  # outbound Markdown link OR is referenced by index.md.
  case "$rel" in
    index.md | log.md) ;;
    *)
      has_outbound=0
      grep -Eq '\]\([^)]+\)' "$f" && has_outbound=1
      base="$(basename "$f")"
      referenced=0
      printf '%s' "$index_body" | grep -q "$base" && referenced=1
      if [ "$has_outbound" -eq 0 ] && [ "$referenced" -eq 0 ]; then
        echo "⚠ W  $rel — órfão: sem link de saída e não referenciado por index.md" >&2
        warnings=$((warnings + 1))
      fi
      ;;
  esac
done

# E3 — reserved files exist + structural keys.
if [ ! -f "$index_md" ]; then
  echo "✗ E3 index.md — arquivo reservado ausente em $OKF_DIR" >&2
  errors=$((errors + 1))
else
  ifm="$(frontmatter "$index_md")"
  [ "$(fm_value "$ifm" type)" = "index" ] || { echo "✗ E3 index.md — 'type' deve ser 'index'" >&2; errors=$((errors + 1)); }
  [ -n "$(fm_value "$ifm" okf_version)" ] || { echo "✗ E3 index.md — falta 'okf_version'" >&2; errors=$((errors + 1)); }
fi

if [ ! -f "$log_md" ]; then
  echo "✗ E3 log.md — arquivo reservado ausente em $OKF_DIR" >&2
  errors=$((errors + 1))
else
  lfm="$(frontmatter "$log_md")"
  [ "$(fm_value "$lfm" type)" = "log" ] || { echo "✗ E3 log.md — 'type' deve ser 'log'" >&2; errors=$((errors + 1)); }
fi

echo "---"
echo "OKF: ${#files[@]} arquivos · $errors erro(s) · $warnings warning(s) · bundle=$OKF_DIR"

if [ "$errors" -gt 0 ]; then
  echo "✗ OKF NÃO-CONFORMANTE ($errors erro(s))" >&2
  exit 1
fi

echo "✓ OKF conformante (E1/E2/E3)"
exit 0
