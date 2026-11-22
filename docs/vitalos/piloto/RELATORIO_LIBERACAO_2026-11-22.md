# Relatório de liberação · piloto interno do Instituto Felicidade para Todos

**Data:** 22/11/2026 · **Candidato integrado:** `integ/piloto-candidato` `e70298b` = `main` `09784aa` (inclui #61) + #58 + #59 + #60, sem conflito de merge.

## Decisão de caminho (ToT)

| Caminho | Valor | Segurança | Esforço (10 = leve) | Tempo até prova |
|---|---|---|---|---|
| **Integrar e provar o fluxo existente** | 9 | 9 | 7 | 8 |
| Simular dependências isoláveis (complemento) | 8 | 9 | 7 | 8 |
| Aguardar publicação | 3 | 9 | 10 | 1 |
| Ampliar funcionalidades | 5 | 5 | 3 | 3 |
| Serviços externos | 4 | 3 | 5 | 4 |
| Abstração compartilhada | 4 | 7 | 3 | 2 |

Integrar e provar, com a pilha descartável simulando o banco. A ordem mudaria se um defeito exigisse migration ou se o build do Lovable mudasse o candidato.

## PRs

| PR | Branch · commit | Conteúdo | Migration |
|---|---|---|---|
| #58 | `feat/mo3-lentes` `923d2b5` | D2 (falha fechada nas leituras de ciclo), fundação Q3, roteiros da pilha (`reset.sh`, `app.ts`, `mo2-journey.ts`, `mail-link.ts`), registros MO2–MO4 e este relatório | Não (a de assentos já está na `main` pelo #57) |
| #59 | `feat/a11y-piloto` `de1a3c9` | Concierge acima da barra inferior abaixo de `xl` | Não |
| #60 | `feat/ajuda-onda4-piloto` `d62f73b` | Ajuda em `/devolutiva`, `/lider`, `/rh` e `/colaborador`; fundo da ajuda acima do concierge (z-69); sem cerimônia como passo | Não |

Correções feitas nesta sessão e onde entraram: fundo da ajuda abaixo do concierge → #60 (`8a74552`); ajuda citava a cerimônia desligada → #60 (`d62f73b`); casos I4/X8/X9 do roteiro → #58 (`ca80f13`).

## O que mudou por perfil

| Perfil | Mudança |
|---|---|
| Colaborador | `/colaborador` explica quem vê práticas e conquistas (só a pessoa; a organização vê quantas, nunca quem, com 5+). `/devolutiva` diz que a leitura é do grupo e quem vê. Concierge não cobre a navegação no celular |
| Liderança | `/lider` explica a ação atribuída, o registro esperado, quem recebe e os limites, e leva a `/ivo-integral/acoes` |
| RH | `/rh` mostra Ler → Designar → Acompanhar → Devolver. Leituras de ciclo com erro mostram "indisponível", não "nenhum ciclo" |

## Provas

| Nível | Resultado | Onde |
|---|---|---|
| Gate completo | 4698 pass / 0 fail, paridade, `tsc`, secret-scan | `e70298b` |
| Jornada Q2 (API = mesmas server functions das telas) | 54 verificações / 0 falha em pilha recriada do zero | `e70298b`, `scripts/integ-local/mo2-journey.ts` |
| Banco descartável | Concorrência com 1 assento: 1 aceito, 1 recusado; leitura independente: Beta sem nenhum dado da Alfa; falha de leitura induzida → indisponível | mesma execução |
| Navegador (login normal por correio local) | Convite → link mágico → aceite → `/colaborador` → Diário com devolutiva sem nomes (390 px); RH, liderança e colaborador nas telas do piloto (MO4 e Onda 4) | `localhost:8094` |
| Navegador (demo) | Concierge fora da barra em 320/390; foco volta ao botão após Escape; ajuda abre no perfil da persona (Liderança, RH); `/ivo`, `/trajetoria`, `/pnl` rotulados como simulação; `/ivo-integral` com os dois botões de método (z-80) | `127.0.0.1:8100` |

Limiares: publicação com 5 ou mais respostas provada na pilha (setor com 4 não publica). Quórum da cerimônia (5 presentes) é regra separada, provada só no motor (`meetsQuorum`): a capacidade `DEVOLUTIVA` está desligada no produto.

## Lovable (22/11/2026, 04:24 UTC)

Cartões de todos os commits desde o #56 marcam "Build malsucedido", inclusive o merge do #61. Mesmo assim, a prévia `preview--vitalos-minha-felicidade-julho.lovable.app` serve o #61: `/ivo-integral` tem "Como calculamos?" e "O que a pesquisa sustenta?", e os dois abrem. Conclusão: a falha é do build de produção (publicação), não da prévia. Log não visível; conta com "0 crédito restante". Ticket de suporte enviado pelo proponente.

## Matriz por lente

| Lente | Estado | Pendência → o que resolve |
|---|---|---|
| Q1 · COPSOQ II-Br curta | Preparação provada (comunicado, controles, delegação, revisão SST). Coleta bloqueada por construção (`method_pending`) | Ficha oficial (enunciados, alternativas, brancos, itens 20–23, soma × média, permissão) → decisão do proponente |
| Q2 · FIB-T | Jornada completa provada (54/0); assentos, concorrência, isolamento, limiar e falha fechada | Migration de assentos aplicada no banco do projeto? → conferência do proponente no Lovable Cloud; extensão da D10 ao piloto (PIL-07); pacote do Instituto |
| Q3 · PERMA+V | Prática Vitalidade 001 v0.2.0 aprovada (escopo local), aviso de prontidão | Extensão ao piloto → proponente; mensuração: ficha da fonte e estatística |
| Q4 · VIA-T | Devolutiva individual exploratória (demo), equipe só com 5+ | Commit/PR do Codex; contrato da leitura coletiva → proponente e Codex |
| Q5 · Relatório Global | Evidência candidata: ação com execução registrada e eficácia "não avaliada" (J8) | Contrato do modo real e do IVO → proponente |

## Recomendação

- **Q2 pronto para o ensaio descartável: sim.** Candidato `e70298b`, gate 4698/0, jornada 54/0, provas de navegador por papel. Reproduzir com `sh scripts/integ-local/reset.sh`, `bun --no-env-file scripts/integ-local/app.ts` e `bun --no-env-file scripts/integ-local/mo2-journey.ts`.
- **Piloto com pessoas do Instituto pronto para iniciar: ainda não.** Faltam, nesta ordem:

| Bloqueio | Responsável | Menor ação |
|---|---|---|
| Build de produção do Lovable falhando | Proponente / suporte Lovable | Resposta do ticket (log de `425b4a9`) ou créditos; depois um build com sucesso |
| Migration de assentos sem confirmação no banco do projeto | Proponente | Conferir no Lovable Cloud se `reserve_member_invite` existe e só `service_role` executa |
| Merge de #58, #59 e #60 | Proponente | Aprovar os três (sem migration); a ordem não importa entre #59 e #60 |
| Pacote do Instituto, responsável operacional e PIL-07 | Proponente e Instituto | Aprovar o pacote da MO4 e nomear o responsável |
| Publicação | Proponente | Publicar depois dos itens acima |

Fila humana: revisão editorial dos textos de ajuda (v0.2.0) e revisão SST; decisão sobre ligar a cerimônia da devolutiva.

## Reconciliação · 22/11/2026

- **Divergência:** a descrição do #58 dizia que ele continha e dependia do #57. O #57 foi mesclado (`425b4a9`); o arquivo da migration estava no #58 apenas por ancestralidade, idêntico ao da `main`. Com duas bases de merge, o GitHub comparava com `5e26e73` e mostrava a migration no diff.
- **Correção:** `main` mesclada em `feat/mo3-lentes` (`923d2b5`), sem reescrever histórico. Diff do #58 contra a `main`: nenhum arquivo em `supabase/`. Nova descrição em `PR58_DESCRICAO_2026-11-22.md` (aplicar no GitHub).
- **Migration:** presente uma vez na `main` (`supabase/migrations/20261121120000_reserve_member_invite_atomic.sql`, manifesto igual). Aplicação no banco do projeto: **não confirmada** (conferência do proponente).
- **Provas:** gate 4686/0 em `923d2b5` (repetido porque a árvore do #58 mudou). Candidato `d4bcebc` tem a mesma árvore que `503ea67` e, fora de `docs/`, que `e70298b` (gate 4698/0 continua válido). Jornada 54/0 em `28b6b11`: desde então mudaram só textos de ajuda e o botão de ajuda em `/colaborador`, fora do caminho da API (continua válida).
- **PRs:** #58 sem migration e pronto para revisão humana; #59 e #60 sem arquivos em `supabase/`, bases já contêm o #57, independentes.
