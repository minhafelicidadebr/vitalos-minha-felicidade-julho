# Plano Operacional ToT - VitalOS / 4 Lentes VITA

Data-base: 2026-06-17
Escopo: organizar o trabalho neste repositório em padrão estado da arte, usando Tree of Thoughts, a doutrina Fable 5 e as recomendações do handover.
## 1. Prompt mestre para próximas sessões

Use este bloco como prompt de ativação antes de qualquer sprint relevante:

```text
Você é o supercomitê fundador Fable 5 do VitalOS / 4 Lentes VITA. Atue como uma bancada interdisciplinar de pós-doutores e operadores seniores em SaaS B2B, arquitetura web, IA, ciência de dados, UX/IX, acessibilidade, gamificação ética, LGPD, NR-1/GRO, ESG/ESRS S1, psicometria, ciência da felicidade, psicologia positiva, neurociência afetiva, economia comportamental, educação positiva, FIB, PERMA+V e ciência da aprendizagem.

Objetivo: evoluir o repositório minhafelicidadebr/vitalos-org-fable5 em padrão estado da arte, preservando a tese: "Clima se mede. Vitalidade se opera."

Antes de agir:
1. Leia HANDOVER_OPUS48.md, docs/SKILL_MESTRA_FABLE5.md, docs/ARQUITETURA_CIENTIFICA.md, CLAUDE.md e o arquivo de domínio afetado.
2. Confirme o estado real com bun install, bun test src, bun x tsc --noEmit e bun run build.
3. Rode ToT para decisões não triviais:
   - Lentes mínimas: ciência, UX, dados/IA, ética/regulatório, negócio.
   - Ramos: A mínimo viável, B robusto, C simular, D adiar, E integrar/comprar, F abstrair para engine.
   - Pontue valor, risco, custo, alinhamento com a tese e reuso multissetorial.
4. Respeite a tríade: engine puro -> testes -> mock -> rota -> wiring -> build verde.
5. Nunca viole: k-anon >= 5, resposta individual fora do cliente, Domínio A separado de Domínio B, IVO/VIA-T fora de desempenho/remuneração, disclaimers científicos, linguagem sem overclaim.

Formato da resposta:
1. Diagnóstico do estado real.
2. ToT resumido com escolha.
3. Arquivos que serão alterados.
4. Critérios de aceite e comandos de verificação.
5. Resultado em linguagem de produto.
```

## 2. Baseline técnico auditado

Estado local verificado nesta sessão:

| Área | Resultado |
| --- | --- |
| Workspace | `C:\Users\FIB2030\Downloads\vitalos-org-fable5-main\vitalos-org-fable5-main` |
| Git local | Esta cópia não tem `.git`; não é possível commitar/pushar daqui sem clonar/inicializar corretamente |
| GitHub remoto citado | `git ls-remote https://github.com/minhafelicidadebr/vitalos-org-fable5.git HEAD` retornou `a8774003b29a932f7a588932bd90fa55182ec741` |
| Dependências | `bun install` executado com sucesso |
| Testes | `bun test src`: 476 pass, 0 fail, 43 arquivos |
| Typecheck | `bun x tsc --noEmit`: limpo |
| Build | `bun run build`: verde |
| Lint | `bun run lint`: falha por Prettier em arquivos existentes e avisos Fast Refresh/hooks |
| Rotas | 45 rotas, incluindo `/`, `/landing` redirect, `/painel`, `/plano-acao`, `/impacto` |

Observações de build:

- O build alerta que alguns chunks passam de 500 kB. A prioridade técnica é lazy-loading de rotas pesadas e Recharts, não mexer em lógica de negócio.
- O Vite informa que `vite-tsconfig-paths` pode ser substituído futuramente por `resolve.tsconfigPaths`, mas isso é baixa prioridade.

## 3. Diagnóstico sistêmico

### Pontos fortes

- O MVP mock-first já fecha M.E.T.E.: Mensurar -> Educar -> Transformar -> Evoluir.
- A camada de engines é ampla e bem testada: IVO, pulse, ESG, VIA-T, season, forecast, priority, evidence, panorama, agent, benchmark, consent, signals, certification, P&L, gamification, nudges, FIB-T, impact e action-plan.
- Existem testes de integração que provam composição, k-anonimato, consentimento, benchmark e IA human-in-the-loop.
- A jornada canônica e o multipack já reduzem risco de acoplamento setorial.
- O produto tem tese clara de categoria: sistema operacional da vitalidade, não pesquisa de clima.

### Gaps críticos

1. **Higiene de repo:** a cópia local não é um repositório Git. Para trabalho real com Lovable/GitHub, o primeiro passo é clonar o repositório oficial correto e trabalhar na `main` sincronizada.
2. **Lint vermelho:** build/test/typecheck estão verdes, mas `bun run lint` falha por formatação. Antes de qualquer commit técnico, rodar `bun run format` ou aplicar Prettier nos arquivos tocados e repetir lint.
3. **Fronteira engine/domain ambígua:** `src/engine/pack/PackProvider.tsx` e `pack-contract.test.ts` importam `src/domain`. Isso viola literalmente "engine nunca importa domain", embora pareça ser um adaptador de boot. Precisa virar decisão explícita: mover o runtime do pack para fora de `engine/` ou registrar exceção controlada.
4. **Copy jurídica sensível:** a landing usava "laudo" e "blindagem" para NR-1. Foi ajustado para "relatório educativo", "prevenção" e linguagem correlacional. O próximo passo é criar teste automatizado para termos vedados na UI pública.
5. **Metadados públicos duplicados:** havia descrição e imagem social antiga incompatíveis com a marca. Foram consolidados em `src/routes/__root.tsx`.
6. **A11y e mobile ainda sem prova automatizada:** há A11yProvider e boas práticas, mas falta Playwright/axe para fluxos críticos: `/`, `/painel`, `/quiosque`, `/onda`, `/responder`, `/sst`, `/viat`.
7. **Domínio B precisa ficar estritamente educativo:** as fontes atuais do MTE reforçam que questionários isolados não comprovam gestão de riscos psicossociais e que a análise não é clínica individual.

## 4. Tree of Thoughts - decisão de organização

Decisão: como organizar a próxima fase de trabalho.

Score = Valor + Tese + Reuso + (10 - Risco) + (10 - Custo). Máximo 50.

| Ramo | Estratégia | Valor | Risco | Custo | Tese | Reuso | Score | Veredito |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| A | Mínimo viável: só listar tarefas no chat | 4 | 3 | 1 | 5 | 2 | 37 | Insuficiente; perde rastreabilidade |
| B | Robusto: documento operacional + auditoria real + backlog | 9 | 3 | 4 | 10 | 8 | 40 | Escolhido como base |
| C | Simular: só criar roadmap hipotético sem tocar código | 5 | 4 | 2 | 6 | 4 | 33 | Útil para pitch, fraco para engenharia |
| D | Adiar: esperar Lovable e créditos antes de organizar | 2 | 6 | 1 | 3 | 2 | 30 | Não resolve o gargalo atual |
| E | Integrar: ancorar em normas externas atuais | 8 | 4 | 4 | 9 | 7 | 36 | Complementar obrigatório |
| F | Abstrair: transformar todo próximo trabalho em engine/test/pack | 8 | 5 | 6 | 10 | 10 | 37 | Escolhido para novas features, não para copy/QA |

Escolha operacional: **B + E + F**, com correções P0 imediatas de confiança pública.

Justificativa: o repositório já tem muito produto. O risco agora não é falta de feature, é drift entre doutrina, copy pública, fronteiras arquiteturais, lint e prontidão para conexão real. A melhor próxima fase é organizar por trilhas de engenharia com critérios de aceite.

## 5. Backlog priorizado

### P0 - Antes de qualquer sprint nova

1. **Repor higiene Git**
   - Trabalhar a partir de clone Git real, não ZIP/pasta sem `.git`.
   - Confirmar repositório correto: o handover local cita `app-vita-happiness-org-fable5`, o usuário citou `vitalos-org-fable5`. Alinhar a origem antes de push.

2. **Deixar qualidade mecânica verde**
   - Rodar `bun run format`.
   - Rodar `bun run lint`.
   - Se warnings Fast Refresh forem aceitos por serem shadcn/ui, registrar exceção. Se não, separar exports auxiliares de componentes.

3. **Formalizar fronteira Pack Runtime**
   - Opção recomendada: mover `PackProvider.tsx` para `src/domain/packs/PackProvider.tsx` ou `src/app/pack/PackProvider.tsx`.
   - Manter `src/engine/pack/pack-types.ts` como contrato puro, sem domínio.
   - Criar teste que falhe se qualquer engine fora de `engine/pack` importar `domain/`; depois remover até essa exceção.

4. **Criar teste de copy sensível**
   - Escanear `src/routes` e `src/features/landing` para termos vedados em contexto público:
     `laudo`, `blindagem`, `diagnóstico psicológico`, `score de talento`, `predição de desempenho`, `ranking de colaboradores`.
   - Permitir exceções apenas em disclaimers negativos: "não constitui laudo", "não é diagnóstico".

### P1 - Bloco 20: UX polish global com prova

1. **QA visual e acessibilidade**
   - Adicionar Playwright para rotas críticas em desktop e mobile.
   - Adicionar axe-core ou equivalente para checagens WCAG 2.2 AA em landing, painel, quiosque e fluxos de resposta.
   - Critérios: sem overflow horizontal, foco visível, contraste adequado, botões com alvo >= 44 px, estados vazio/carregando/erro.

2. **Mobile-first para operação**
   - Priorizar `/quiosque`, `/onda`, `/responder`, `/devolutiva`, `/colaborador`.
   - A usuária operacional sem e-mail corporativo é o caso principal, não exceção.

3. **Performance**
   - Code-splitting por rotas pesadas e charts.
   - Lazy-load de Recharts e módulos de landing que ficam abaixo da dobra.
   - Meta: reduzir chunk inicial e manter a primeira tela rápida.

### P1 - H2: conexão real sem quebrar mock-first

1. **Auth real com feature flag**
   - `USE_REAL_AUTH` para Lovable Cloud/Supabase.
   - RLS por tenant antes de qualquer dado real.
   - `/login` e guard no root, mantendo demo mock isolado.

2. **Persistência de ondas server-side**
   - Edge function `POST /api/waves`.
   - Respostas individuais nunca entram no estado do cliente.
   - Agregação e k-anon no servidor.

3. **Multi-tenant**
   - `organizations`, `org_members`, `pack_id`.
   - `PackProvider` resolve pack por organização, não hardcoded.

4. **FlorescerIA em produção**
   - Edge function com grounding por IVO + priority + evidence + season.
   - Consentimento e k-anon verificados no servidor.
   - Guardrails NIST/OWASP: prompt injection, provenance, pré-teste, incidente, saída insegura e vazamento de dados.

5. **Benchmark real**
   - Coortes server-side.
   - Nenhum dado de outro tenant chega ao cliente.
   - Apenas resultado agregado com `MIN_COHORT_ORGS = 5`.

### P2 - Ciência, dados e moat

1. **Validação científica do IVO**
   - Roadmap: consistência interna, estrutura fatorial, invariância, validade convergente com WHO-5/UWES/PERMA.
   - Até lá, manter IVO como experimental, não clínico.

2. **Culture Lab como dataset de eficácia**
   - Padronizar taxonomia de protocolo, hipótese, população, n, efeito, confiança e contexto.
   - Proteger tenant e indivíduo; liberar só meta-aprendizado k-anon.

3. **ESG/ESRS S1**
   - Mapear indicadores próprios para estrutura de "own workforce".
   - Mostrar materialidade, população coberta, limitação de dado e fonte de evidência.

4. **Domain packs**
   - Escola já prova a tese. Próximos packs devem nascer sem alterar engine: condomínio, governo, saúde.

## 6. Definition of Done Fable 5

Toda entrega técnica relevante só fica pronta quando:

- Engine puro sem import de domínio, quando houver engine.
- Testes cobrem fronteiras, clamps, k-anon, limiares e cenários negativos.
- Mock determinístico existe e conta uma história de demo em 60 segundos.
- Rota tem 4 estados: vazio, carregando, erro e mobile.
- Wiring em pack + `NAV_ROUTES` + `NAV_GROUPS` está coerente.
- `bun test src`, `bun x tsc --noEmit`, `bun run build` e `bun run lint` estão verdes ou exceção documentada.
- Disclaimers científicos e regulatórios aparecem onde necessário.
- Nenhuma resposta individual aparece no cliente.
- Nenhuma copy promete validade clínica, jurídica, financeira ou desempenho.
- Resultado é explicável para colaborador, líder, RH, CFO e auditor.

## 7. Referências externas atuais usadas como âncoras

- W3C WAI - WCAG 2.2 Overview: https://www.w3.org/WAI/standards-guidelines/wcag/
- NIST AI RMF e Generative AI Profile: https://www.nist.gov/itl/ai-risk-management-framework
- OWASP Top 10 for LLMs and Gen AI Apps 2025: https://genai.owasp.org/llm-top-10/
- ISO 45003:2021, riscos psicossociais em SST: https://www.iso.org/standard/64283.html
- MTE - NR-1, materiais oficiais: https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-1
- MTE - Manual de interpretação e aplicação do capítulo 1.5 da NR-1, atualizado em 13/05/2026: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/manuais-e-publicacoes/2026/manual_gro_pgr_da_nr_1.pdf/view
- MTE - Perguntas e respostas sobre NR-1, 1a rodada, 30/04/2026: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/canpat-2/canpat-2025/perguntas-e-respostas-gro-pgr-1a-rodada.pdf
- EFRAG ESRS S1 Own Workforce: https://www.efrag.org/sites/default/files/sites/webpublishing/SiteAssets/ESRS%20S1%20Delegated-act-2023-5303-annex-1_en.pdf
- ANPD: https://www.gov.br/anpd/pt-br

## 8. Próxima sequência recomendada de commits

1. `chore(format): align prettier and lint baseline`
2. `refactor(pack): clarify pack runtime boundary`
3. `test(copy): guard public UI against forbidden claims`
4. `test(a11y): add critical route smoke checks`
5. `perf(routes): lazy-load heavy visual modules`
6. `feat(auth): scaffold real auth flag and tenant boundary`
