# Linhagem duplicada — compensações de replay

Arquivos deste diretório **não são migrations** e nunca são aplicados em staging
ou produção. Cada arquivo tem o nome EXATO de uma migration e roda imediatamente
antes dela, **somente** no replay local (`bun run db:replay`).

## Por que existem

Em 2026-07-03 duas migrations foram geradas pelo Lovable (nomes com UUID,
timestamps `20260703203653` e `20260703203735`) reproduzindo SQL que também foi
escrito à mão e retrodatado para timestamps anteriores no mesmo dia. As duas
linhagens descrevem o mesmo estado final, mas contêm statements sobrepostos.

Aplicadas em produção pelo SQL Editor, statement a statement, a sobreposição
passou sem consequência. Aplicadas em **ordem lexicográfica num banco limpo** —
que é o que o Supabase CLI faria e o que um rebuild de recuperação faria — a
segunda criação do mesmo objeto aborta a cadeia inteira.

Colisão conhecida hoje:

| Migration duplicada | Objeto | Criado antes por |
| --- | --- | --- |
| `20260703203653_aef6adcc-60fe-4bc4-b9b6-0fbd11f276f5.sql` | `wave_capsules_wave_id_unique` (UNIQUE constraint) | `20260703160000_wave_lifecycle_and_capsule_upsert.sql` |

## Por que não corrigir a migration histórica

Editar o arquivo resolveria o replay em uma linha, e é a opção errada:

- o hash dele está fixado em `supabase/migrations.manifest.json`;
- e citado em `docs/fibt-prod-proof/PROD06_NONPROD_PROOF_PLAN.md`, um artefato de
  prova já emitido.

Reescrever migration já aplicada para consertar um problema que só existe no
replay troca uma inconveniência local por um furo na cadeia de custódia. O
manifesto existe justamente para que esse tipo de edição falhe o gate.

## Por que isto não mascara defeito

Toda compensação é `DROP ... IF EXISTS` do objeto que a duplicata vai recriar de
forma idêntica:

- se o objeto **não** existisse, o `DROP` é no-op e a criação seguiria de todo
  jeito — o resultado do replay é o mesmo;
- qualquer erro **novo** (objeto diferente, sintaxe, dependência) continua
  abortando o replay, porque `ON_ERROR_STOP=1` segue valendo para a migration;
- o replay reporta quantas migrations usaram compensação, então o número nunca
  cresce em silêncio.

## Dívida registrada

Retirar as duas migrations duplicadas (consolidando a linhagem) é **P2**: exige
recomputar o manifesto, reemitir o documento de prova e reconciliar o histórico
de aplicação em produção e staging. Não é pré-requisito de nenhum gate de
segurança, e não bloqueia o G1.
