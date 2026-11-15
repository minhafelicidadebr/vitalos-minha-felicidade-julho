# Habilitação empresarial Q1/Q2 — evidência local de 2026-11-15

**Prova visual posterior a `7bae2bc`:** conector Chrome validou a URL local e permitiu a jornada antes bloqueada. Autoridade sintética da plataforma alterou Q1/Q2 de Alfa; administrador conferiu os estados, teve escrita recusada em sessão já aberta e leitura recusada por URL direta; Q1 habilitado continuou pendente e Q2 voltou a funcionar com Q1 desligado. Alfa terminou Q1 off/rev44 e Q2 on/rev87; Beta permaneceu off/rev9 e off/rev13, confirmados também em processo independente. Nenhuma migration/manifesto foi alterado ou reaplicado. Prova dirigida, correções alcançáveis, gate/build e limites em [Q2_ENTERPRISE_WAVE1_LOCAL_2026-11-15.md](Q2_ENTERPRISE_WAVE1_LOCAL_2026-11-15.md). O bloqueio abaixo é histórico, não o estado desta nova prova; CI/staging/comercial continuam sem confirmação.

## Fechamento dirigido após 1e2d8a0

HEAD conferido em `1e2d8a0`, sem alterações rastreadas posteriores. A lista visual de três SQL inclui o rascunho `20261114010000_enterprise_module_entitlements.sql`: ele não existe na árvore nem no histórico Git; foi substituído, antes do commit, pelo arquivo gerado pelo CLI `20261115135955`. Não constitui terceira migration aplicada. Nesta onda foram aplicadas as ordens 65/66 abaixo; 63/64 pertencem à onda anterior. Não há inconsistência no manifesto a corrigir, nem migration a reorganizar.

Cobertura preservada: upgrade do stack sintético já provisionado e instalação vazia **da fatia** sobre schema copiado, com ambas as migrations 65/66, não replay completo desde o bootstrap. Nenhuma reaplicação nesta retomada; gate, build e provas HTTP/DB anteriores não foram repetidos.

Diagnóstico suportado do navegador: inicialização de `@oai/sky`, inventário e seleção de janela retornada; captura de estado disponível. Na tentativa de abrir uma guia de teste, a ferramenta interrompeu a automação com: “could not determine the current browser URL on Windows with enough confidence to enforce policy”. Nenhuma navegação local ou alteração de módulos foi executada nesta retomada. Não foram alteradas permissões/validação, nem tentado outro mecanismo para contornar a interrupção. A prova visual e a confirmação persistida de suas futuras alterações permanecem pendentes.

Roteiro manual curto, exclusivamente no stack próprio (API 57621, DB 57622, app 8091; conferir identidade antes de escrever):

1. Entrar em `http://localhost:8091/plataforma` com a identidade sintética `platform@institutional.test`, pelo e-mail local no Mailpit `http://127.0.0.1:57624`. Registrar o estado inicial de Beta, sem tokens ou links de login.
2. Selecionar Alfa pelo nome/slug/ID. Habilitar Q1 e desabilitar Q2, confirmando cada alteração. Com `alfa@institutional.test`, conferir `/rh`: Q1 metodologicamente pendente e Q2 desabilitado. Tentar `/ivo-integral/q2` diretamente e recarregar: dados devem continuar recusados.
3. Manter a sessão Alfa aberta em navegador separado. Pela plataforma, desabilitar Q1 e habilitar Q2. Atualizar Alfa: Q2 deve abrir sem exigir Q1. Desabilitar Q2 novamente pela plataforma; na sessão Alfa já aberta, repetir a operação e recarregar a URL direta: acesso deve ser recusado.
4. Conferir Beta com `beta@institutional.test`: estado inicial inalterado. Reabrir o inventário da plataforma e conferir revisões/estados de Alfa/Beta em nova leitura; registrar apenas estados, revisão e resultado das tentativas. Não presumir confirmação de persistência pela aparência de um botão.

Menor marco Q2: após fechar essa interação, demonstrar pelo produto uma única empresa sintética da configuração do ciclo à leitura protegida e criação/acompanhamento de uma ação, reutilizando as provas válidas de coleta, publicação, isolamento, PI-13/C8 e concorrência. A fonte COPSOQ é dependência específica de Q1 e não impede esse marco Q2.

Base preservada: branch `feat/ivo-fibt-platform-foundation`, HEAD anterior `0d95791be00944818f2cd7e84a2067ceabc87847`. Esta documentação acompanha a implementação; não há publicação remota.

## Contrato implementado

`org_module_entitlements` guarda estado explícito por empresa/módulo, revisão, ator e instante. Ausência nega acesso. `org_module_changes` é o registro de alterações, com unicidade por ator/pedido. A alteração de estado e seu registro são transacionais. O servidor reutiliza `verifyPlatformAdmin`; RH_ADMIN não é autoridade de plataforma. As organizações existentes não recebem habilitação automática.

Sessão, vínculo, papel, habilitação, método e elegibilidade/privacidade permanecem condições separadas. Q1 habilitado continua metodologicamente bloqueado pela ausência de correspondência ao artefato aprovado. A aprovação informada pelo operador não foi reaberta. Q2 não depende de Q1. Não foram criados índice IVO, mapeamentos dimensionais, faixas ou aprovação de eficácia.

Os limites de billing continuam existentes. O plano `pilot` admite apenas COPSOQ; nesta prova, apenas Alfa/Beta sintéticas receberam explicitamente plano `enterprise`. Habilitação não substitui quotas, piloto FIB-T ou capabilities globais. Outros packs e lentes fora desta fatia mantêm seus gates anteriores; o marcador SQL interno `LEGACY` preserva seu comportamento, sem criar módulo comercial adicional.

## Inventário e cobertura

| Operação alcançável | Proteção implementada |
| --- | --- |
| Plataforma: listar/alterar Q1/Q2 | `module-access.functions.ts` / `module-access.server.ts`: sessão verificada, allowlist de plataforma, schema estrito, revisão esperada e request UUID. Destino é empresa existente, sem provisionar outra. |
| Painel institucional | `EnterpriseModules.tsx`: empresa inequívoca na plataforma, confirmação/cancelamento/retry; cartões na `/rh`, sem demo. Estados Q2 derivados de `loadIvoQ2Reading`: sem ciclo, coleta, proteção e publicação. Método Q1 separado. |
| Criar/fechar onda | `wave-admin.server.ts`: habilitação e método antes da operação. Triggers verificam novamente no ponto transacional da escrita. Listagens administrativas não liberam dados de módulos recusados. |
| Setores/links | `sector-link.functions.ts`, `sector-operations.functions.ts`, `fibt-manager-control-center.functions.ts`: sessão/papel e onda da empresa; habilitação resolvida pela onda persistida. Triggers cobrem coortes/links/convites. |
| Participação por token | `invite-resolve.server.ts`, `response-capture.server.ts`, `sector-link.server.ts`: token e vínculo persistido; habilitação vigente sem conceder papel RH ao respondente. As RPCs de submissão não contornam os triggers. |
| Cálculo/publicação e leitura Q2 | `capsule-aggregator.server.ts`, leitor FIB-T e `ivo-q2-reading.server.ts`; RPC pública `aggregate_cohort_responses` verifica tenant/habilitação sob lock e chama a implementação privada de privacidade. RLS restritiva protege acesso autenticado direto. |
| Resultados/relatórios/exportações | `capsule-report.functions.ts`, listagem de cápsulas, leitor Q2 e Board Brief real verificam origem/habilitação. Exportação cliente só recebe o resultado já autorizado, sem novo endpoint de dados. Arquivos previamente baixados não são revogados. |
| Ações/PI-13, evidências, aprendizagem vinculada e C8 | `authorizeLedger` verifica habilitação Q2 após sessão/papel. As operações existentes mantêm validação de recurso/fonte. Triggers derivam origem de onda/item/protocolo persistidos e impedem reclassificação; criação de plano tem verificação diferida na mesma transação dos itens. Sem suporte novo a planos mistos. |
| Ciclos/ESG/devolutiva/planos legados | Capabilities globais continuam fechadas. Foram adicionados guards ao histórico/registro de ciclos; a fatia **não** comprova ativação desses módulos nem todos os seus antigos caminhos privilegiados. Reabertura exige revisar suas próprias RPCs e persistência. Demonstrações explicitamente identificadas continuam ilustrações, sem acesso a dados institucionais por substituição. |

`service_role` contorna RLS: por isso as consultas privilegiadas têm autorização/escopo no servidor e as mutações pertinentes têm triggers. A RPC DEFINER canônica recebeu proteção própria; uma policy de SELECT sozinha não a restringiria. A implementação de privacidade anterior foi movida para schema não exposto, com EXECUTE revogado dos papéis de API.

## Concorrência, revogação e compatibilidade

Alterar habilitação e admitir mutação protegida adquirem o mesmo lock de organização. A operação que adquiriu o lock primeiro termina antes; a segunda revalida estado após aguardar. Se desabilitação venceu, a mutação é recusada e sua transação não deixa vínculos/plano parciais. Leituras novas consultam o estado vigente, sem usar entitlement em JWT/React como autoridade. Respostas já entregues a uma operação anteriormente admitida não são apagadas do cliente.

Desabilitar preserva respostas, snapshots, ações e evidências. Sem política comercial específica de histórico, aplica-se acesso restritivo. Reabilitação permite consultar os registros ainda elegíveis; não recalcula metodologia nem altera publicações anteriores por si só.

Ordem conferida no manifesto: `20261113195527_institutional_first_admin.sql` (63), `20261113202253_institutional_first_admin_private_identity.sql` (64), `20261115135955_enterprise_module_entitlements.sql` (65), `20261115142320_enterprise_module_pack_compatibility.sql` (66). As duas anteriores foram preservadas. As novas são drafts locais desta entrega, aplicadas somente no stack próprio; a segunda consolida a compatibilidade antes de qualquer promoção compartilhada.

## Provas e reprodução

Alvo verificado antes das escritas: projeto/container `vitalos-institutional-first-admin`, API `127.0.0.1:57621`, DB `127.0.0.1:57622`, app `localhost:8091`. Nenhum reset do stack preservado, migration remota, e-mail externo ou conta real.

| Evidência | Resultado e limite |
| --- | --- |
| `bun run scripts/institutional-module-proof.ts` | **43 verificações aprovadas** via Auth, server functions HTTP POST, PostgREST e SQL local controlado: quatro combinações, autoridade insuficiente/sessão inválida/escrita direta recusadas, retry concorrente, CAS, Q1 pendente, Q2 sem Q1, publicação antes/depois de k, proteção temporal com uma resposta adicional, Beta habilitada sem acesso a Alfa, sessão já aberta bloqueada após desabilitar, duas ordens de concorrência, rótulo adulterado/rollback, falha real de SELECT negando acesso, preservação e regressão dirigida do primeiro administrador. |
| `...institutional-module-proof.ts readback` | **3 verificações aprovadas** em processo independente, novos logins com chave pública, apenas os próprios vínculos/estados visíveis. Logout local não invalida outras sessões. |
| `...institutional-module-schema-proof.ts` | Instalação vazia da fatia sobre cópia de schema, sem dados, em DB separado `module_clean_*` dentro do container próprio. Grants novos, publicador privado, outras lentes preservadas e ausência de habilitação recusada. **Não é replay integral da linhagem desde o bootstrap Supabase**; ACLs/owners antigos da cópia são omitidos e a prova de usuários usa o stack principal próprio. |
| `bun run gate` | **4273 pass / 0 fail / 330 arquivos**, paridade, TypeScript e secret-scan aprovados no candidato de produto. Quatro fixtures de testes anteriores precisaram explicitar a dependência de habilitação. Após corrigir apenas o launcher/transportes dos scripts locais, **123 testes de guards** passaram; a prova HTTP foi concluída no launcher corrigido. |
| `...institutional-module-inert-build.ts` | Build final inerte aprovado em `.institutional-admin.local/module-build-1794753203868`, endpoints `.invalid`, sem copiar `.env` ou credenciais, sem instalar dependências. Secret-scan exigindo artefato aprovado. Tamanho/mtime/inventário da `.output` original comparados antes/depois e preservados. Avisos preexistentes de `inputValidator` deprecado e arquivos de teste na árvore de rotas não foram tratados como mudança desta fatia. |
| Navegador real desta onda | **Não comprovado.** Computer Use foi interrompido porque não conseguiu determinar a URL atual no Windows com confiança suficiente para aplicar a política. Não houve fallback para contornar a restrição. A prova visual anterior continua restrita ao primeiro administrador, não valida estes novos cartões. |

Artefatos sanitizados, ignorados pelo Git: `.institutional-admin.local/module-proof.json`, `module-readback.json`, `module-schema-proof.json`, `module-build-proof.json` e logs `module-gate-final.log`, `module-harness-tests.log`. Não contêm tokens/magic links/respostas. A configuração do launcher foi corrigida: perfil IVO **ausente**, não string vazia; preflight local e Vite no runtime Node, sem herdar flags de staging/HML. O diagnóstico `...institutional-module-proof.ts reading` emite somente estado/categoria da leitura.

## Revisão focada e riscos residuais

| Risco | Evidência | Nível | Tratamento / prova |
| --- | --- | --- | --- |
| Autoridade institucional se promover | `module-access.server.ts:126`; migration 65:28 | P1 mitigado | Ator verificado pela plataforma; sem grants de escrita para authenticated; recusas HTTP/API comprovadas. |
| Corrida com desabilitação ou retry | migration 65:32; migration 66:60 | P1 mitigado | Lock comum, CAS, unicidade de pedido e rollback; ambas as ordens exercitadas em conexões independentes. |
| DEFINER/service_role ignorarem policy | migration 65:146; migration 66:3 | P1 mitigado no escopo | Publicador privado, wrapper autenticado, guards do servidor e triggers; sessão do usuário + credencial pública usada para isolamento. |
| UX/interação nova sem prova real | `EnterpriseModules.tsx:28` e `:169` | P1 aberto | Build e apresentação testados, mas navegação/login/toggle/recarga desta onda dependem da recuperação do controle de navegador. Não há homologação visual/a11y completa. |
| Fonte COPSOQ não incorporada | `module-contract.ts`; checkpoint | P1 bloqueio metodológico | Q1 continua bloqueado mesmo habilitado; aguarda apenas localização/correspondência ao artefato já aprovado. |
| Escala/rollout e legado fechado | listagem limitada a 200 empresas; capabilities legadas fechadas | P2 aberto | Paginação/rollout real e reabertura dos caminhos legados não foram aprovados nem provados nesta entrega. Nenhum backfill. |

Maturidade: implementação e evidências locais de HTTP/DB/build concluídas; a comprovação integrada **com navegador** permanece incompleta. CI deste candidato não confirmado; sem staging, homologação remota ou liberação comercial. `.q.out` e `.q.sql` não foram abertos, alterados, apagados ou indexados.

Próximo marco único: concluir a prova de navegador do operador e do administrador institucional, com alteração de módulo, recarga e tentativa protegida na mesma sessão, quando o controle conseguir validar a URL novamente. A fonte exata Q1 continua dependência metodológica separada, já comunicada ao operador.
