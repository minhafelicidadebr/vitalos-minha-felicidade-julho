# Q3 · onda "fundação → primeira jornada verificável" · 20/11/2026

Branch `feat/claude-q3-fundacao` (base `d8f2dbd`); demo em `feat/q3-demo-sintetica` (`8d30023`, já na `main`).

## Escolha (ToT)

Caminho: **Educação/Transformação em paralelo + contrato da jornada**, mensuração bloqueada. Evidência decisiva: (1) nenhuma autorização de uso do instrumento foi recebida; (2) o PDF primário repete o item 10 em Realização; (3) a fonte não traz regra de pontuação nem de ausências. Fechar a ficha ou ligar a jornada agora exigiria inventar dados da fonte.

## A · Fonte e cálculo — bloqueado

| Verificação | Resultado |
| --- | --- |
| PDF do artigo (SHA-256 `67bf13b5…b8cec2`) | Tabela 2: item 10 ("se sente positivo/a") listado em P **e** em Realização — duplicação está na fonte primária, não na conversão |
| `docs/instrumentos/PERMA_TRABALHO.md`, item 15 ("se sente capaz") | **Não aparece** na Tabela 2 do artigo; origem não rastreada |
| Escala | 0–10 com âncoras variadas (artigo, seção de instrumentos) |
| Regra de pontuação e de ausências | ausente no artigo |
| Instrumento original | Workplace PERMA Profiler (Butler & Kern, 2016) |
| Licença do artigo | CC BY-NC — acesso ao artigo ≠ permissão para aplicar o instrumento em produto comercial |
| Autorização dos autores | **não recebida** |

Três coisas distintas: aprovação interna (fundador: dada) · acesso ao artigo (temos) · permissão para reproduzir/aplicar em produto (falta).

**Pedido único:** o documento de autorização dos autores do Workplace PERMA Profiler (escopo: uso comercial, aplicação online, versão pt-BR) **e** o manual de pontuação ou a versão oficial pt-BR do instrumento, que resolvem ordem dos 15 itens (item 10/realização), polaridade, ausências e agregação.

Enquanto isso: ficha não versionada; verificador (`scripts/check-perma-v-source.ts`) recusa; `isQ3Activatable()` falso. Demo: itens trocados por exemplos autorais ilustrativos na branch da demo (commit local, não publicado).

## B · Vitalidade — pronta para revisão

`src/domain/ivo/q3-vitality-unit-001.json` (PROPOSTO) + `docs/vitalos/decisions/Q3_VITALIDADE_UNIDADE_001_REVISAO.md`. Prática: pausa entre reuniões por 2 semanas; registros separados de participação, execução e mudança percebida; 3 checagens; critérios de revisão. Não ligada ao app.

## C · Contrato da primeira jornada empresarial (revisável)

Pré-condições: ficha aprovada (A), migration local do módulo Q3 (Q3-06, autorizada para ambiente descartável), Q3-04 (k ≥ 5).

| # | Passo | Aceite (verificado no servidor) | Reuso |
| --- | --- | --- | --- |
| 1 | RH habilitado prepara aplicação na Empresa Alfa | sessão e `org_id` do servidor; módulo Q3 ativo; registra `instrumentVersion` da ficha | `authorizeIvoSession`, `org_module_entitlements` |
| 2 | Colaborador elegível responde | só via fluxo institucional; consentimento versionado; resposta não volta ao cliente | fluxo de resposta do Q2 |
| 3 | Persistência | resposta e versão sobrevivem a novo login | ledger/RPCs `service_role` |
| 4 | RH lê agregado | só fatores por recorte com n ≥ 5; recorte abaixo do limiar suprimido **também por acesso direto à API** | lote protegido do Q2 |
| 5 | Devolutiva | colaborador: coletiva; liderança: coletiva + só ações próprias | projeção fechada do C2; `q3-role-policy` |
| 6 | Recusas | Empresa Beta, módulo inativo, SST e papel desconhecido: recusados no servidor; nenhum perfil vê resposta individual | `q3-role-policy`, guard de módulo |

Prova: pilha descartável `scripts/integ-local/` com Alfa e Beta fictícias; navegador com RH, colaborador, liderança e SST; persistência após relogin. Lente oficial permanece `planned` até a prova.

## D · Relação com o IVO — pesquisa

| Elemento | Estado |
| --- | --- |
| Hipóteses H1–H5 | propostas (rascunho v0), sem confirmação do estatístico |
| Unidade de análise: equipe | proposta |
| Mínimo por equipe (k ≥ 5 em cada instrumento) | **aprovado** (Q3-04) |
| Número mínimo de equipes (N_eq) | **pendente** — estatístico (é distinto do k) |
| Limiar convergente C | pendente — estatístico |
| Janela de "mesmo ciclo" | pendente |
| Método (Spearman) | proposto |
| Revisor independente | pendente |

Análise só agregada; sem cruzamento individual; sem equivalência entre lentes nem índice composto. Q3-05 continua `pending` em `q3-readiness.ts`; mudar a regra de ativação exige decisão registrada.
