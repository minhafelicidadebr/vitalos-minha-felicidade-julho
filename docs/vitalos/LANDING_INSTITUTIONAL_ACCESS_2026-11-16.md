# Entrada institucional pública — fechamento local de 16/11/2026

Base: `c30260a`, branch `feat/ivo-fibt-platform-foundation`, sem alterações rastreadas prévias. Este incremento torna explícito o acesso institucional, separado da demonstração e do contato comercial. Não amplia a disponibilidade do par Q2 aprovado, não altera autenticação, papéis, habilitações, dados metodológicos ou decisões Q1/ESG.

## Implementado

Link nativo `/entrar` no cabeçalho, bloco principal de acesso e rodapé, com nome acessível “Entrar na plataforma institucional”. O callback existente continua decidindo o destino pela identidade e vínculo. “Explorar demonstração” mantém o gate e o destino legado `/painel`; não há redirect institucional fixado nem dependência do estado da demo.

Marca compacta no mobile, controles de cabeçalho com alvo mínimo de 44 × 44 px, CTAs com quebra de texto e grades que respeitam a largura disponível. Foram corrigidos cortes reais de conteúdo no hero, ponte educativa e dimensões IVO. Regras de dimensionamento ficam restritas à página pública, sem alterar o Button global. O diálogo de demonstração cabe em 320 px e devolve o foco ao acionador ao fechar por Escape ou botão.

## Prova no navegador local

Ambiente descartável já existente em `http://localhost:8091`, preservado sem reset. Conta sintética Alfa já autenticada: entrada institucional levou a `/rh`, com “Empresa Fictícia Alfa”, sem abrir demo. Após logout normal, os três pontos de entrada levaram a `/entrar`, com formulário “Entrar com link mágico”. Nenhum e-mail foi enviado nesta etapa.

Demo bloqueada exibiu o gate; senha incorreta foi recusada. Fechamento por Escape e pelo botão restaurou o foco ao acionador. A senha válida não foi reenviada: o ramo desbloqueado não foi comprovado ao vivo nesta etapa; seu código e destino foram preservados.

| Viewport CSS | Client width | Scroll width | Resultado observado |
| ---: | ---: | ---: | --- |
| 320 | 300 | 300 | Sem overflow; nenhum texto cortado nos elementos inspecionados; cabeçalho ≥44 px |
| 360 | 340 | 340 | Sem overflow ou controle cortado; cabeçalho ≥44 px |
| 768 | 748 | 748 | Sem overflow ou controle cortado; cabeçalho ≥44 px |
| 1280 | 1260 | 1260 | Sem overflow ou controle cortado; links de navegação ≥44 px de altura |

Diálogo em 320 px: largura 288 px, margens de 16 px, botão de fechar 44 × 44 px. Viewport original restaurado. Capturas reais sanitizadas: [desktop](artifacts/LANDING_ACESSO_INSTITUCIONAL_DESKTOP_2026-11-16.jpg), [mobile 320](artifacts/LANDING_ACESSO_INSTITUCIONAL_MOBILE_320_2026-11-16.jpg). Medidas e resultados: [JSON](artifacts/LANDING_ACESSO_INSTITUCIONAL_PROVA_2026-11-16.json).

Uma captura do diálogo mobile retornou timeout; as capturas da página em desktop e mobile foram obtidas. As medidas e interações não equivalem a auditoria WCAG completa. A captura mobile desta página não substitui a revisão visual pendente da página de ações Q2.

## Verificação técnica

- Três novos testes de componentes: links nativos, separação entre destinos e disponibilidade institucional sem callback de demo; 19 asserções.
- Testes dirigidos de landing e guards: 133 aprovados, 155 asserções.
- Gate integrado final: **4.346 pass, 0 fail, 342 arquivos, 13.540 asserções**.
- TypeScript, paridade de schema, secret-scan, lint dirigido, formatação dos arquivos de produto e revisão de diff aprovados.
- Build inerte isolado aprovado; saída `.output` da raiz preservada. Oito arquivos `src/` deste candidato conferidos por SHA-256 contra a cópia final compilada, todos idênticos. Build local em `.institutional-admin.local/module-build-1794801684937`; metadados em `module-build-proof.json`.

A tentativa inicial de montar toda a landing em teste de router causou encerramento nativo do Bun (`-1073740791`). O arquivo experimental foi removido; a cobertura final combina testes dos componentes e navegação real no navegador.

O primeiro gate encontrou uma omissão no incremento anterior: o novo harness de releitura não estava registrado na família de scripts estritamente locais e não chamava diretamente o guard exigido pelo teste estático. O helper já validava API/DB/container/project_id. Agora o script chama explicitamente `requireInstitutionalLocalTarget` antes de consultas e integra a família correspondente; a allowlist de bypass permanece vazia. Nenhuma consulta ou regra de releitura mudou. As 12 verificações DB anteriores permanecem evidência do cenário, sem repetição desnecessária. O gate final acima inclui a correção.

## Arquivos do fechamento

Produto: `src/routes/index.tsx`; `src/features/landing/components/InstitutionalAccessLink.tsx`, `LandingCtaSection.tsx`, `LandingHero.tsx`, `WhyItMattersSection.tsx`, `FourLensesSection.tsx`. Testes: `LandingAccess.test.tsx` nesse diretório e `src/lib/staging/scripts-guard-coverage.test.ts`. Harness: `scripts/institutional-approved-learning-readback.ts`. Documentação: este registro, checkpoint, adendo ao registro Q2 D10 anterior e três artefatos sanitizados acima.

## Limites e próximo incremento

Entrega implementada e comprovada localmente. CI, staging, homologação remota, eficácia e prontidão comercial não foram confirmados. Sem migration, push, deploy, conta real, e-mail externo ou alteração de autoridade. `.q.out` e `.q.sql` não foram abertos, alterados ou incluídos.

**Próximo incremento técnico único:** revisar a experiência de `/entrar` e os estados de recuperação do link mágico, preservando contratos de identidade, callback e isolamento institucional existentes.
