# Estratégia de regeneração dos tipos (FIBT-1)

## Situação

Dois arquivos declaram o schema em TypeScript:

| Arquivo | Origem | Ocorrências de `invite_token` |
|---|---|---|
| `src/integrations/supabase/types.ts` | **gerado** pelo Lovable | 8 |
| `src/lib/cloud/database.types.ts` | mantido à mão | 1 |

Nenhum dos dois conhece `wave_cohorts`, `aggregate_cohort_responses` ou
`count_cohort_participation`, porque foram criados por migrations que o
gerador ainda não viu.

Consequência atual: `src/lib/api/fibt-cohort.functions.ts` usa
`const db = supabase as any` — o mesmo escape hatch já documentado em
`learning-adapter.ts:14`.

**O escape hatch é temporário e não pode sobreviver ao merge da FIBT-1.**
Enquanto ele existir, um erro de nome de tabela ou de coluna nesse arquivo
passa pelo `tsc` sem ser notado.

## Ordem obrigatória

Regenerar antes da Migration B produziria tipos que ainda declaram
`invite_token`, e seria preciso regenerar de novo. Uma vez só, no fim:

1. Migration A — **aplicada**
2. Privacy hardening — pendente
3. Migration B — pendente
4. **Regeneração dos tipos** — aqui
5. Remoção do escape hatch
6. Merge da FIBT-1

## Passo 4 — regenerar

O gerador é do Lovable e escreve `src/integrations/supabase/types.ts`. Depois
que a Migration B estiver aplicada em staging, peça a regeneração no Lovable
(ou aguarde o sync automático) e confirme:

```bash
grep -c "invite_token" src/integrations/supabase/types.ts   # esperado: 0
grep -c "wave_cohorts" src/integrations/supabase/types.ts   # esperado: >0
grep -c "aggregate_cohort_responses" src/integrations/supabase/types.ts
grep -c "count_cohort_participation" src/integrations/supabase/types.ts
```

`src/lib/cloud/database.types.ts` é mantido à mão: remova a linha de
`invite_token` e acrescente `cohort_id`, `instrument`, `instrument_version`
em `wave_responses`, mais a tabela `wave_cohorts`.

> **Não editar `types.ts` à mão.** O arquivo é sobrescrito na próxima geração
> e a correção se perde em silêncio.

## Passo 5 — remover o escape hatch

Em `src/lib/api/fibt-cohort.functions.ts`:

1. Apagar `const db = supabase as any` e o comentário que o justifica.
2. Trocar `db.` por `supabase.` nas duas chamadas.
3. `bunx tsc --noEmit` tem que passar **sem** o cast.

Se não passar, os tipos não foram regenerados de verdade — não reintroduza
o cast para "destravar".

## Guarda automática

`src/lib/fibt/fibt-types-regeneration.test.ts` falha enquanto o escape hatch
existir **e** os tipos já estiverem regenerados: assim que `types.ts` deixar
de citar `invite_token` e passar a citar `wave_cohorts`, o teste exige que o
cast tenha sumido. Antes disso ele permanece verde, para não bloquear a
preparação.

É um lembrete que não depende de memória humana: o débito fecha sozinho ou
quebra o build.

## Risco se nada for feito

Sem a regeneração, o projeto final depende permanentemente de `as any` na
camada que fala com o banco — justamente onde um erro de nome vira falha
silenciosa em runtime, e não erro de compilação.

---

# Camada de cálculo — decisão arquitetural

`aggregate_cohort_responses` devolve `factor_scores` e `domain_means`
**sempre nulos**, por desenho.

| Camada | Responsabilidade |
|---|---|
| PostgreSQL | agrega `item_means`, aplica k-anon, escopo de tenant |
| Engine canônico | 3 Fatores · 9 leituras de domínio · escore bruto 0–12 |

A fonte metodológica única é o manifesto canônico + loader fail-closed +
engine versionado. Duplicar as fórmulas em SQL criaria uma segunda definição
do instrumento, fora do manifesto e fora dos testes canônicos — a divergência
que a FIBT-0 existiu para eliminar.

Os campos permanecem no contrato como nulos explícitos: reservados, não
esquecidos.

## Fail-closed da camada de relatório

`buildFibtCohortReport` recusa produzir escore quando:

1. o grupo está abaixo de k-anon (suprimido);
2. o agregado não cobre os 32 itens com valores válidos (incompleto);
3. a versão do instrumento gravada nas respostas difere da carregada
   (`versao_incompativel`) — entre versões um item pode mudar de Fator, e
   aplicar a definição de hoje sobre respostas de ontem produz um número que
   parece certo e não é;
4. o manifesto não carrega — `loadFibtCohortReport` captura a exceção do
   loader e devolve `estado: "erro"`, nunca uma página em branco nem um
   escore montado com definição parcial.

A supressão por privacidade é avaliada **antes** da checagem de versão:
proteger quem respondeu não pode depender de a versão bater.
