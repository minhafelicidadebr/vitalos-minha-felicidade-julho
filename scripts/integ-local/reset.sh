#!/bin/sh
# Recria a pilha descartável vitalos-q1q2-integ do zero (loopback) e aplica a cadeia do checkout.
# Sem volume nomeado: tudo o que havia é descartado. Nenhum segredo é impresso.
# Uso: sh scripts/integ-local/reset.sh
set -eu
D="$(cd "$(dirname "$0")" && pwd)"
E="$D/.env.integ"
[ -f "$E" ] || { echo "rode antes: bun scripts/integ-local/keygen.ts"; exit 1; }
dc() { docker compose -f "$D/compose.yml" --env-file "$E" "$@"; }
dc down >/dev/null 2>&1 || true
dc up -d db >/dev/null
i=0
until [ "$(docker exec vitalos-q1q2-integ-db psql -U supabase_admin -d postgres -X -tAc "select count(*) from pg_roles where rolname in ('authenticator','supabase_auth_admin')" 2>/dev/null | tr -d '[:space:]')" = "2" ]; do
  i=$((i+1)); [ $i -gt 60 ] && { echo "banco não inicializou"; exit 1; }; sleep 3
done
PW=$(grep '^POSTGRES_PASSWORD=' "$E" | cut -d= -f2-)
printf "ALTER ROLE authenticator WITH PASSWORD '%s';\nALTER ROLE supabase_auth_admin WITH PASSWORD '%s';\nALTER ROLE postgres WITH PASSWORD '%s';\n" "$PW" "$PW" "$PW" \
  | docker exec -i vitalos-q1q2-integ-db psql -U supabase_admin -d postgres -q -X -v ON_ERROR_STOP=1
unset PW
dc up -d >/dev/null
sleep 10
sh "$D/apply-chain.sh"
docker exec vitalos-q1q2-integ-db psql -U postgres -d postgres -X -tAc "NOTIFY pgrst, 'reload schema'" >/dev/null
echo "pilha recriada"
