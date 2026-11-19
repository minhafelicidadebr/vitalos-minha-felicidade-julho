# VitalOS · Q3 PERMA+V · superprompt da próxima onda

Prompt inicial para Claude Code ou Codex. Preencha só a ativação. Linguagem de evidência: "comprovado" só com prova citada; nada de metodologia inventada.

```text
AGENTE = CLAUDE_CODE | CODEX
FRENTE = Q3_PERMA_V
FATIA = F0 | F1 | F2 | F3 | F4 | F5 | F6   (uma por sessão; F3–F6 só com a decisão citada registrada)
AUTORIZAÇÕES ADICIONAIS = nenhuma, salvo instrução expressa do operador
```

## 1. Ponto de partida (19/11/2026)

- Branch `feat/claude-q3-fundacao`, worktree `..\vitalos-claude-q3`, HEAD `9459323`, base `6d48c48`. Ainda **sem** as correções posteriores da integração (`cda7c3d` SST, `655ce95` delegação, `f8cabb9` B2.1 + linhagem), que vivem em `integ/q1-q2-merge`.
- Entregue: `src/domain/ivo/q3-readiness.ts` (8 pré-condições, `isQ3Activatable()`), `Q3ReadinessNotice` em `/ivo-integral` (informativo, "1 de 8 decisões registradas", provado no navegador a 320/390 px), dossiê `docs/vitalos/decisions/DOSSIE_DECISOES_Q3_LINHAGEM_PILOTO_2026-11-19.md`.
- Catálogo: `perma_v` Q3 `planned`, sem versão nem rota. Contrato de módulo só `Q1|Q2`.
- Decisões: **Q3-07 decidida** (papéis espelhando Q2: RH aplica e lê agregado; liderança só ações próprias; membros só devolutiva coletiva; ninguém vê respostas individuais). **Q3-06**: módulo só após Q3-01..03. **Pendentes**: Q3-01 instrumento e "+V", Q3-02 fonte/permissão, Q3-03 itens/escala/cálculo, Q3-04 limiar, Q3-05 mapeamento IVO, Q3-08 conteúdo educativo.
- Única referência no repo: `docs/instrumentos/PERMA_TRABALHO.md` (15 itens 0–10, Seligman 2011 + validação BR 2026 citada, mapeamento a pilares IVO) — **candidato a verificar, não fonte aprovada**; fora do Evidence Registry.

## 2. Escolha (ToT · 0–10; Prova e Independência com peso duplo)

| Ramo | Valor | Prova×2 | Independência×2 | Risco metodológico | Custo | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **A. Consolidar base → contratos neutros prontos para a decisão → instrumento só após Q3-01..03** | 8 | 18 | 20 | 10 | 7 | **63** |
| B. Implementar já o PERMA de 15 itens do documento | 9 | 10 | 14 | 2 | 6 | 41 |
| C. Conteúdo educativo PERMA primeiro (antes de Q3-08) | 7 | 8 | 18 | 4 | 6 | 43 |
| D. Módulo Q3 + rota agora | 5 | 12 | 12 | 5 | 5 | 39 |

**Decisão: A.** Fator decisivo: B e C consumiriam uma fonte não aprovada e criariam claims; A deixa cada decisão humana com efeito imediato e verificável (a infraestrutura espera a decisão, não o contrário).

## 3. Fatias

**F0 · Consolidar a base** *(sem decisão)*
Trazer `integ/q1-q2-merge` (`f8cabb9`) para a branch Q3 por merge revisado (comparar diffs; conflitos só em arquivos compartilhados). Aceite: gate verde no SHA resultante; aviso Q3 inalterado.

**F1 · Verificador de fonte do Q3, fail-closed** *(sem decisão; prepara Q3-02/03)*
Espelhar `scripts/check-copsoq-source.ts`: schema da referência (`edição, forma, idioma, arquivo+hash, itens, opções, polaridade, ausências, casos esperados`) e comparador contra um manifesto candidato. **Nenhum item, texto ou escala no repo.** Sem referência registrada, o verificador falha com a pendência citada. Aceite: testes com referência sintética marcada `TEST` (rejeitada fora do teste); `isQ3Activatable()` continua falso.

**F2 · Política de papéis do Q3 (Q3-07 decidida)** *(sem rota, sem módulo)*
Função pura `q3-role-policy.ts` reutilizando o padrão `leader-scope-policy`: operações `apply | read_aggregate | run_feedback | own_actions | collective_feedback`; individual nunca. Testes por papel (RH, liderança, colaborador, SST, outra org). Aceite: nenhum import em produção até F5 (teste de importadores, como no Q2).

**F3 · Instrumento e cálculo** *(só com Q3-01, Q3-02 e Q3-03 registradas)*
Manifesto versionado em `src/domain/instruments/perma_v/` a partir da referência aprovada; F1 verde contra ela; motor puro por fator com os casos esperados do próprio registro; `buildPassport()` para qualquer texto de status. Sem rota pública.

**F4 · Habilitação** *(só com F3 e Q3-06)*
Migration aditiva `Q3` em `org_module_entitlements` + `method_pending` até a liberação; nenhuma função nova em `public` (M6A); incluir no pacote clean do replay; prova na pilha `scripts/integ-local/`.

**F5 · Publicação agregada** *(só com Q3-04)*
Reusar o lote protegido do Q2 (k e lote do registro Q3-04); devolutiva coletiva com a projeção fechada do C2; política de F2 ligada no servidor.

**F6 · Educar e matriz** *(Q3-08 para conteúdo; Q3-05 para matriz)*
Unidade/atividade versionada no padrão D10 com revisão editorial registrada; matriz IVO só se Q3-05 decidir mapear — **sem índice composto**.

## 4. Invariantes

- Q3 independente: não lê respostas, escores ou resultados de Q1/Q2; não infere equivalência.
- Org, papel e dono resolvidos no servidor; k≥5 e lote protegido; nada individual no cliente.
- Nenhum claim além dos `safe_claim` registrados; nenhum DOI, efeito ou percentual inventado.
- `.q.out`, `.q.sql`, `.env*`: não abrir. Sem push, deploy, migration remota ou stack preservado.
- Commit só com o gate aplicável verde; navegador para toda UI nova (desktop, 320/390 px, teclado).

## 5. Economia de contexto

Abrir com `git rev-parse HEAD`, `git status --short --branch`, `git log --oneline 6d48c48..HEAD`. Ler por símbolo; reutilizar padrões citados (`check-copsoq-source.ts`, `leader-scope-policy.ts`, `member-plan-feedback.server.ts`, `scripts/integ-local/`) em vez de redescobrir. Gate amplo só quando o runtime mudar.

## 6. Passagem e critério do comitê

Ao fechar cada fatia: agente, fatia, SHA base/entregue, resultado observável, verificações (comando, contagem, ambiente), decisão humana pendente com responsável, próxima ação única. Veredito do revisor: **aceito no escopo demonstrado**, **requer ajuste** (achado, arquivo, condição) ou **depende de decisão identificada** (Q3-0x, responsável).
