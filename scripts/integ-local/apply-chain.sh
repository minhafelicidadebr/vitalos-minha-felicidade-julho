#!/bin/sh
# Aplica a cadeia do candidato na pilha vitalos-q1q2-integ (mesmos critérios de scripts/institutional-local.ts).
set -u
D="$(cd "$(dirname "$0")" && pwd)"
sh "$D/guard.sh" || exit 1
REPO="$(cd "$D/../.." && pwd)"
cd "$REPO" || exit 1
echo "candidato: $(git rev-parse --short HEAD)"
sql() { docker exec -i vitalos-q1q2-integ-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X -tA "$@"; }
[ "$(echo "SELECT (to_regclass('public.organizations') IS NULL)::text;" | sql)" = true ] || { echo "banco não está vazio; nada aplicado"; exit 1; }
n=0
for f in $(ls supabase/migrations/*.sql | sort); do
  b=$(basename "$f")
  case "$b" in 20260730160000_drop_response_invite_link_contract.sql|20260806210000_drop_response_invite_link_contract_production.sql) continue;; esac
  [ -f "supabase/local/lineage/$b" ] && { sql < "supabase/local/lineage/$b" >/dev/null 2>"$TEMP/integ-err.txt" || { echo "FAIL compensação $b: $(grep -m1 ERROR $TEMP/integ-err.txt)"; exit 1; }; }
  if grep -qiE '^\s*BEGIN\s*;' "$f"; then sql < "$f" >/dev/null 2>"$TEMP/integ-err.txt"; else sql --single-transaction < "$f" >/dev/null 2>"$TEMP/integ-err.txt"; fi
  [ $? -eq 0 ] || { echo "FAIL migration $b: $(grep -m1 ERROR $TEMP/integ-err.txt | cut -c1-220)"; exit 1; }
  n=$((n+1))
done
echo "ok $n migrations aplicadas (2 exclusões históricas, compensações de lineage)"
