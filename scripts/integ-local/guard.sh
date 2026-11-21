#!/bin/sh
# Guard da pilha descartável vitalos-q1q2-integ: aborta se projeto, containers ou bindings divergirem.
fail() { echo "GUARD FAIL: $1"; exit 1; }
for c in db mail auth rest kong; do
  n=vitalos-q1q2-integ-$c
  [ "$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' $n 2>/dev/null)" = vitalos-q1q2-integ ] || fail "container $n fora do projeto"
done
[ "$(docker port vitalos-q1q2-integ-db | tr -d '\r')" = "5432/tcp -> 127.0.0.1:57922" ] || fail "binding do banco"
[ "$(docker port vitalos-q1q2-integ-kong | tr -d '\r')" = "8000/tcp -> 127.0.0.1:57921" ] || fail "binding da API"
[ "$(docker port vitalos-q1q2-integ-mail | tr -d '\r')" = "8025/tcp -> 127.0.0.1:57924" ] || fail "binding do correio"
[ -z "$(docker port vitalos-q1q2-integ-auth)$(docker port vitalos-q1q2-integ-rest)" ] || fail "auth/rest publicados"
echo "guard ok: projeto vitalos-q1q2-integ · API 127.0.0.1:57921 · DB 127.0.0.1:57922 · correio 127.0.0.1:57924"
