# Macro-onda empresarial autônoma — fechamento local de 16/11/2026

## Base, escopo e resultado

Repositório `C:\Users\FIB2030\claude code\vitalos-ivo-fibt-foundation`, branch `feat/ivo-fibt-platform-foundation`. Base inicial `c30260a`; alterações anteriores da entrada pública identificadas e preservadas, fechadas em **ff8c933**. O superprompt preexistente foi preservado e integra este fechamento. Nenhum reset, stash, operação remota, migration, seed ou mudança metodológica.

Resultado: acesso institucional com recuperação explícita, espera finita, mensagens sanitizadas e identidade VitalOS; sessão institucional independente da hidratação do demo; navegação Q2 mantém a origem publicada selecionada; indicadores do plano legíveis em telas estreitas. Não há ampliação da aprovação D10 ou disponibilidade remota.

## Capacidades e evidência

| Frente | Entrega ou constatação | Evidência / limite |
| --- | --- | --- |
| 0 · entrada pública | Commit local do candidato anterior, sem repetir suas provas | ff8c933; registro LANDING_INSTITUTIONAL_ACCESS_2026-11-16.md |
| 1 · formulário | Submissão concorrente no cliente bloqueada; campos indisponíveis durante envio; sucesso condicional não afirma existência de conta; troca de e-mail e novo pedido explícitos | src/features/auth/InstitutionalAuth.tsx:40; testes de componente; navegador com e-mail local |
| 1 · callback | Link inválido mantém tela de recuperação e retorno sanitizado; erro de consulta não vira ausência de perfil; retry sem loop automático | src/lib/auth/auth-recovery.ts; src/routes/auth.callback.tsx; testes de erro retornado/lançado e destinos |
| 1 · gate | Sessão institucional não depende de hasHydrated do demo; eventos de sessão concluem carregamento; espera com recuperação finita | src/app/auth/AuthGate.tsx; auth-gate-state.ts e quatro testes de política |
| 2 · origem Q2 | Clique em Bem-Estar passa setor/fator ao formulário do plano existente, em vez de assumir o primeiro fator | src/routes/ivo-integral.acoes.tsx:188; published-action-source.ts; testes recusam preferência alheia/incompleta/protegida |
| 2 · gráfico mobile | Rótulos com excesso de largura corrigidos; uma coluna antes de 480 px, duas intermediárias e quatro a partir de sm | src/components/ivo/ActionFollowUp.tsx:29; medidas e captura reais |
| 3 · Q1 | Preparação e bloqueio existentes preservados, sem promover manifesto demonstrativo | CopsoqPreparationNotice e seu teste; fonte exata/correspondência na fila de decisões |
| 4 · relatório/ESG | Código alcançável distingue corpo demonstrativo e anexo institucional; pré-revisão não autoriza emissão | relatorio-global.tsx; esg-evidence-review.ts/test.ts; vínculos reais permanecem dependentes de decisão |

A revisão dessas últimas duas frentes não exigiu alterar produto: os limites já implementados atendem ao comportamento permitido na ausência das fontes/decisões. Não se criou RAG/LLM, novo ledger, motor, score, relação ESG ou contrato de papel. A macro-onda não equivale a concluir as capacidades dependentes das decisões pendentes.

## Prova integrada no navegador

O sandbox inicialmente recusou acesso ao pipe Docker. A chamada de leitura pelo fluxo normal de aprovação validou o harness existente: API `http://127.0.0.1:57621`, DB local em 57622, container `supabase_db_vitalos-institutional-first-admin`, identidade/configuração de projeto e app `http://localhost:8091`. Sem setup ou reinicialização. Docker disponível, isoladamente, não foi usado como prova de alvo.

1. Callback sem sessão apresentou “Solicite um novo link”, com foco no título, sem redirecionamento temporizado. A recuperação preservou `redirect=/rh`.
2. Formulário solicitou link para a conta fictícia Alfa; mensagem recebida no Mailpit local em 57624. Link da mensagem, com origem local conferida sem imprimir credenciais, foi aberto no mesmo navegador. Nenhuma sessão administrativa foi gerada.
3. Primeiro ensaio chegou a `/rh`, mas expôs “Verificando acesso…” persistente após recarga. A inspeção confirmou a condição que exigia hidratação do demo mesmo para sessão institucional. Após a correção, o painel carregou “Empresa Fictícia Alfa”, Q1 desligado e Q2 com publicação disponível. Recarga confirmou acesso e vínculo.
4. Navegação real abriu Q2 e as ações existentes. A aplicação D10 0.1.0 persistiu com uma execução e uma aprendizagem, eficácia não avaliada; resumo manteve quatro ações, três execuções e três aprendizagens. Nenhuma nova aplicação foi enviada.
5. Captura em 320 px revelou rótulos dos indicadores excedendo 79 px disponíveis: Execuções 92 px, Aprendizagens 116 px e Avaliações 89 px. Depois do ajuste, os quatro rótulos tiveram largura/scroll idênticos (200/200 px em 320; 240/240 em 360), sem overlap ou overflow horizontal.
6. Logout foi feito pelo menu normal. Formulário anônimo conferido em 320/360/768/1280 px, com client width = scroll width; campos e botão com altura 48 px. Viewport original restaurado.
7. Segundo login normal pelo Mailpit, após a última alteração de navegação, percorreu painel → leitura Q2 → “Definir prioridade para Bem-Estar em Equipe sintética”. Formulário do plano existente selecionou **bem_estar / Bem-Estar**, setor **Equipe sintética**, sem envio de nova ação.

**Totais desta etapa:** dois pedidos de e-mail exclusivamente locais; zero novas ações/evidências de negócio, organizações, perfis ou alterações de módulos. Nenhum dado real ou e-mail externo.

[Medidas e primeira prova](artifacts/MACRO_ONDA_AUTONOMA_BROWSER_2026-11-16.json) · [Prova da origem Q2 após segundo login](artifacts/MACRO_Q2_ORIGEM_PROVA_2026-11-16.json).

[Entrada desktop](artifacts/MACRO_ACESSO_DESKTOP_2026-11-16.jpg) · [Entrada mobile 320](artifacts/MACRO_ACESSO_MOBILE_320_2026-11-16.jpg) · [Resumo Q2 mobile 320](artifacts/MACRO_Q2_PLANO_MOBILE_320_2026-11-16.jpg) · [Link inválido](artifacts/MACRO_ACESSO_LINK_INVALIDO_2026-11-16.jpg) · [Alfa após login](artifacts/MACRO_ACESSO_LOGIN_ALFA_2026-11-16.jpg).

## Verificação, candidato e reaproveitamento

- Recuperação, redirects e gate: **25 testes direcionados / 64 asserções**.
- Composição do plano e painéis Q2 após ajustes: **57 testes / 253 asserções**.
- Gate integrado do candidato final: **4.366 pass, 0 fail, 345 arquivos, 13.591 asserções**. Paridade, TypeScript e secret-scan aprovados.
- Build inerte final aprovado em `.institutional-admin.local/module-build-1794805740591`; `.output` da raiz preservada. **13 arquivos finais de fontes/testes conferidos por SHA-256 contra a cópia compilada**, todos idênticos.
- Lint/Prettier das novas fontes de autenticação e helper Q2 aprovados. Lint semântico dos arquivos legados alterados aprovado. `ActionFollowUp.tsx` tem 43 apontamentos preexistentes de Prettier tanto no HEAD quanto no candidato; foram preservados para evitar reformatação alheia. Não se declara lint global verde.
- `git diff --check` aprovado. Nenhuma mudança de dependência/configuração/migration.

Comandos: `bun --no-env-file test src scripts`; `bun --no-env-file scripts/schema-parity-check.ts`; `node node_modules/typescript/bin/tsc --noEmit`; `bun --no-env-file scripts/build-secret-scan.ts`; build `bun --no-env-file scripts/institutional-module-inert-build.ts`; testes dirigidos nos arquivos citados. Prettier/ESLint foram executados pelos binários Node locais. Bunx falhou com `CouldntReadCurrentDirectory`; não houve instalação de ferramenta. O build dentro do sandbox teve o mesmo erro; pelo fluxo normal de aprovação, a cópia isolada compilou sem mudança de preflight.

Os primeiros gates desta onda (4.360 e 4.364) foram sucedidos somente porque a prova encontrou e motivou mudanças no gate e no contexto de navegação Q2. Não foram repetidas provas HTTP/DB/concorrência sem alteração correspondente. As 12 verificações DB de D10 e as provas anteriores Alfa/Beta permanecem referenciadas em seus candidatos/ambientes; **Beta não foi percorrida novamente nesta etapa**. O gate final cobre os testes de isolamento existentes, sem substituir prova viva de banco.

Uma primeira versão dos novos testes DOM com `await act` ficou pendente; foi interrompida e substituída por resolução controlada e espera breve do DOM. Os testes finais passaram, com avisos React de atualizações assíncronas fora de `act` no ambiente simulado; não houve supressão global desses avisos. Uma expectativa estática de variável `authRedirect` também detectou uma renomeação desnecessária, revertida sem enfraquecer o teste.

## Limites e decisões agrupadas

A nova captura mobile válida comprova o resumo da página de ações. A tentativa de captura do cartão aprovado, distante no scroll, retornou quadro vazio; não foi versionada nem usada como prova. A verificação funcional/DOM da aplicação permanece válida, mas sua inspeção detalhada por pixels ainda está incompleta. Timeouts CDP foram diagnosticados pelo procedimento suportado, sem desativar validação, ampliar permissões ou aguardar indefinidamente.

Roteiro manual residual: no ambiente local, entrar normalmente como Alfa, abrir Q2 → ações, localizar “Aplicação Q2 aprovada — D10 0.1.0 — ensaio local” em 320/360 px e conferir visualmente cabeçalho, referências, execução/aprendizagem e foco, sem enviar novo registro. Não repetir a jornada de persistência já comprovada.

A espera de envio é limitada na interface, mas a requisição subjacente não é cancelada pelo deadline; uma resposta tardia pode entregar e-mail. Por isso a mensagem orienta verificar a caixa antes do retry; não se promete idempotência ou rate limit de envio no servidor. Link expirado/usado é tratado como incapacidade de validar, sem diagnóstico preciso inventado. Erros de rede/perfil e deadline têm testes isolados, não injeção de falha ao vivo no provedor.

Este fechamento não comprova auditoria WCAG completa, carga/SLA, eficácia, CI, staging, homologação, piloto com clientes ou prontidão comercial. Direitos já informados da COPSOQ não foram reabertos; a dependência é identificar a fonte exata para correspondência ao que é servido. Nenhum mapeamento IVO, critério D9, vínculo ESG ou nova curadoria foi aprovado pelo agente.

Decisões concretas e artefatos para revisão estão em [MACRO_ONDA_AUTONOMA_DECISOES.md](MACRO_ONDA_AUTONOMA_DECISOES.md). **Próximo marco único:** revisão do pacote local para delimitar o piloto Q2 (empresa/coorte, responsáveis, versão, período e protocolo), mantendo a fonte COPSOQ como dependência específica de Q1. Sem autorização desse piloto, a disponibilidade educativa aprovada continua local.

## Arquivos alterados nesta onda

Autenticação: `src/routes/entrar.tsx`, `src/routes/auth.callback.tsx`, `src/app/auth/AuthGate.tsx`; novos `src/features/auth/InstitutionalAuth.tsx` e teste; `src/lib/auth/auth-recovery.ts` e teste; `src/app/auth/auth-gate-state.ts` e teste. Q2: `src/components/ivo/ActionFollowUp.tsx`, `src/routes/ivo-integral.acoes.tsx`, `src/lib/ivo/published-action-source.ts` e casos em `src/components/ivo/PlanComposition.test.tsx`. Documentos: este fechamento, execução, decisões, checkpoint, superprompt anteriormente criado e sete artefatos sanitizados. Os arquivos da entrega anterior estão discriminados no registro da landing e no commit ff8c933.

`.q.out` e `.q.sql` não foram abertos, alterados, processados ou incluídos. Sem push, deploy, migration remota, e-mail externo ou alteração de conta real.
