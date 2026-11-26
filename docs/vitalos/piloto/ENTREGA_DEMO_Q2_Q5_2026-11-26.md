# Entrega · percurso demonstrativo Q2 → Q5 (revisão técnica)

**Data:** 26/11/2026. **Branch:** `work/q2-q5-decisao`, a partir de `work/q2-orientacao-integrada` (que é o #81). **Nada foi enviado, mesclado ou publicado.** Dados 100% sintéticos, em pilha descartável local.

## 1. Estado dos PRs e dos checks

| PR | Conteúdo | Base | Check remoto |
|---|---|---|---|
| #78 (Codex) | Orientação Q2/Agir, percurso sintético, devolutiva ao Q5, guia Q1/Q3/Q4 | `main` | `gate` verde em `5b5422f` |
| #80 | Parte do perfil e link do guia com perfil | branch do #78 | **sem check** (a CI só roda com base na `main`) |
| #81 | #78 + #80 + `main` + `7702482` + `5c835ae` | `main` | `gate` verde em `5c835ae` |
| esta branch | #81 + `2758df3` (Q5) + ajuste do cabeçalho | (sem PR) | não rodou no remoto |

## 2. Opções de integração e recomendação

Diff funcional ignorando só o CR no fim da linha: o #81 muda **17 arquivos (+531 −13)** em relação à `main`; o complemento sobre o #78 é de **12 arquivos (+210 −23)**.

| Opção | Como | O que preserva | Custo |
|---|---|---|---|
| **A (recomendada)** | Integrar o #78; depois um PR para a `main` só com o complemento: `3e0fb08` (#80), `7702482`, `5c835ae`, `2758df3` e o ajuste do cabeçalho | Tudo, em diffs pequenos de revisar | O Codex precisa concordar com os arquivos que tocamos em comum |
| B | Escolher o #81 como entrega integrada | Já contém #78, #80 e as duas correções; `gate` verde | Revisão de 8 commits do Codex junto; quando o #78 mudar, o #81 diverge |

Recomendo **A**: o #78 já foi revisado pelo Codex, tem CI verde e o complemento fica pequeno. O #81 é o plano B, e a branch desta entrega pode ser retargetada para qualquer das duas.

**Conteúdo a preservar no complemento:** `guide-role.ts` e `q2-orientation.ts` (texto do guia, com teste de paridade); a validação do perfil em `GuideJourney.tsx` (`7702482`); os rótulos "Execução registrada/prevista" e "Aprendizagem a observar" (`5c835ae`); `Q5Synthesis.tsx`.

## 3. O que mudou nesta rodada

- `2758df3` **Q5 termina em uma proposta.** Novo `src/features/guide/Q5Synthesis.tsx`, usado no passo Q5 do percurso sintético. Responde às quatro perguntas (prioridade e motivo; planejado e registrado; aprendido e a observar; proposta, quem revisa e quando), mostra Manter, Ajustar e Encerrar com a **sugestão marcada em texto** (manter com execução registrada, ajustar sem registro), responsável (RH com a liderança), ponto de revisão (primeira semana do próximo ciclo) e o link para o Q1 no guia. É ilustrativo: nenhuma decisão é registrada. O efeito segue "ainda não avaliado".
- **Cabeçalho em 320 px.** `src/app/shell/PackSwitcher.tsx`: `max-[359px]:gap-1 max-[359px]:px-2` no botão do seletor de setor. Antes o cabeçalho do modo demonstração alargava a página para 330 px (10 px de rolagem horizontal); agora 320 px, sem excesso. Mexe em componente de shell: vale avisar o Lovable.

## 4. Como reproduzir (ambiente local)

Pré-requisitos: Docker Desktop ligado e `C:\Users\FIB2030\.bun\bin` no PATH.

**Portas.** Se o Windows reservar o intervalo 57837–57936 (`netsh interface ipv4 show excludedportrange protocol=tcp`), a pilha em 57921/57922/57924 não sobe. As portas são fixas em `scripts/integ-local/` (não há como substituí-las por configuração). Para a verificação, troquei-as só na cópia de trabalho e desfiz depois:

```powershell
sed -i 's/57921/47921/g; s/57922/47922/g; s/57924/47924/g' scripts/integ-local/app.ts scripts/integ-local/compose.yml scripts/integ-local/guard.sh scripts/integ-local/mail-link.ts scripts/integ-local/mo2-journey.ts
```

Depois: `sh scripts/integ-local/reset.sh`, `bun --no-env-file scripts/integ-local/app.ts` (em segundo plano) e `bun --no-env-file scripts/integ-local/mo2-journey.ts` (cria a organização fictícia "Alfa" com contas de RH, liderança e colaborador). Ao final: `docker compose -f scripts/integ-local/compose.yml --env-file scripts/integ-local/.env.integ down` e `git checkout -- scripts/integ-local`.

**Percurso sintético (sem login).** O app local precisa do portão de demonstração: gere um verificador (`createPresentationVerifier` em `src/lib/presentation/access.server.ts`) para uma senha de teste **sua**, passe `VITALOS_DEMO_ORIGIN=http://localhost:8094` e `VITALOS_DEMO_VERIFIER` ao processo do app (o `app.ts` filtra variáveis `VITALOS_*` do ambiente; na verificação acrescentei uma linha temporária para repassá-las). Destrave pela home ("Explorar demonstração") e abra `/rh?percurso=q2` → liderança → equipe → `/relatorio-global?percurso=q2&pratica=decisao&registro=feito`.

**Telas autenticadas.** Entrar com o link mágico: peça o link em `/entrar` com `rh.alfa@integ.test` (ou `lider.alfa`, `colab.alfa`) e leia-o no correio local com `bun --no-env-file scripts/integ-local/mail-link.ts <e-mail>`. Abra `/ivo-integral/q2`, `/ivo-integral/acoes` e `/ivo-integral/guia?etapa=Q2&perfil=<perfil>`.

**Observação de desenvolvimento.** Com `sessionStorage` limpo, a tela de abertura (splash) só some ao clicar nela em modo dev (o cleanup do efeito cancela os temporizadores). Pré-existente; fora do escopo.

## 5. Evidências

**Comprovado visualmente (tela, local, sintético)**

| Cenário | Resultado |
|---|---|
| RH, liderança e colaborador em Q2 e Agir; link do guia com perfil | Rodada de 26/11: parte, destino e `perfil=` corretos; o colaborador mantém a orientação com "Acesso não autorizado" |
| Percurso RH → liderança → equipe → Q5 por cliques | Foco vai ao título de cada passo; "Efeito no indicador: ainda sem avaliação" |
| Volta, avanço e recarga | O estado vem da URL e é mantido (liderança ↔ equipe; recarga na devolutiva) |
| Q5 em 320 px | As 4 perguntas, as 3 opções e a sugestão marcada em texto; **sem rolagem horizontal depois do ajuste do cabeçalho** (antes: 330 px) |
| Botões flutuantes em 320 px | Ocupam a base à direita (x 245–309, y 503–627) e a barra inferior (y 642–707). **Nenhuma ação da jornada fica inacessível**: os 4 alvos do Q5 recebem o clique no centro e à direita quando rolados ao centro, e o último link da página fica livre no fim da rolagem. Sem mudança de layout necessária |
| Foco por teclado | Shift+Tab chega ao link do Q1 com foco visível e anel; Enter abre o bloco de orientação (768 px) |
| Contraste dos textos novos do Q5 | Mínimo de 5,77:1 no tema claro e 6,5:1 no escuro (AA = 4,5:1), medido por script com o fundo composto |

**Coberto por teste:** perfil adulterado no guia, parte por perfil e paridade com o guia, rótulos de estado, as 4 perguntas do Q5, a sugestão por estado e o link do Q1 (`GuideJourney.test.tsx`, `Q2JourneyOrientation.test.tsx`, `Q2DemoWalkthrough.test.tsx`).

**Pendente ou não verificado:** app publicado (build e publicação no Lovable); contraste da orientação logada e do guia (só a seção do Q5 foi medida nesta rodada); variante "pendente" do Q5 só por teste, não em tela; `GuideJourney.tsx` do #78 revisado só pelo diff funcional, sem rodada visual das etapas Q1/Q3/Q4 no guia; o texto do Q3 menciona o "seletor de perfil da demonstração" também na rota institucional (anotado, não alterado).

## 6. Decisões humanas

1. Ordem de integração (A ou B) e se o Codex incorpora o complemento: impacto é o tamanho e a estabilidade da revisão.
2. Aviso ao Lovable sobre `PackSwitcher.tsx`, componente de shell.
3. Tornar as portas da pilha local configuráveis (frente independente, sem decisão).
