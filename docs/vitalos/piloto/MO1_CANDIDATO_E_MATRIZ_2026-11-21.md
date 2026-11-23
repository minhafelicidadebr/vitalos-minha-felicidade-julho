# Macro-onda 1 · Candidato, sinal do CI e matriz do piloto do Instituto

## 1. Candidato

| Item | Valor |
|---|---|
| Repositório | `minhafelicidadebr/vitalos-minha-felicidade-julho` |
| Candidato de integração | `main` @ `268dfbc` (contém a integração Q1+Q2 `6eff411`/`f8cabb9` e as Ondas 1–3 de ajuda) |
| Correção do CI | branch `fix/ci-sinal` @ `ed51c04`, PR #56 (draft) |
| Preservados | checkout do Codex (`codex/q4-pratica-forcas`, alterações não commitadas), `.q.out`, `.q.sql`, demais worktrees |

## 2. Sinal do CI

O gate falhava em todo PR por 4 testes com 3 causas, todas divergência entre contrato de teste e configuração da `main`; nenhuma regressão de código.

| Causa | Origem | Correção (commit) |
|---|---|---|
| `.env` com `SUPABASE_PROJECT_ID`/`VITE_SUPABASE_PROJECT_ID` fora da allowlist | Gerados pelo Lovable Cloud | Allowlist como identificador público; o teste 4b segue validando o formato (`e371edd`) |
| `dev` e `build:dev` sem preflight | Commit do Lovable `c476aa7` (10/11, coautoria do founder), com `dev:checked` para uso local | Exceção do sandbox do Lovable fixada nos valores exatos; demais comandos continuam exigindo preflight (`dce2923`) |
| Tipos com `submit_sector_response` em união multilinha | Regeneração dos tipos pelo Lovable (`4b8f1ce`) | Exige a assinatura com consentimento; a legada é fail-closed e só `service_role` (`ed51c04`) |

**Prova:** local `bun run gate` = 4641 pass / 0 fail, paridade, `tsc` e secret-scan; GitHub Actions no PR #56 = gate aprovado (1 min 10 s).

## 3. Divergências que afetam o piloto

| # | Divergência | Efeito no piloto | Onde se resolve |
|---|---|---|---|
| D1 | Na `main`, o plano Piloto conta **todo** perfil como assento (limite 1) | O RH do Instituto não consegue convidar ninguém no plano Piloto | PR de `fix/assentos-administrativos` + migration `20261121120000` (autorização para aplicar remotamente). **Atualização 23/11:** #57 mesclado; função aplicada por consulta direta em 22/11, permissões conferidas, ausente do histórico de migrations; convite ponta a ponta no app publicado não testado |
| D2 | Board Brief, histórico, Reavaliação NR-1 e dossiê PGR transformam erro de leitura em "nenhum ciclo" | Leitura falha parece ausência de dado | Mesmo padrão `failClosed` já aplicado na Expedição (MO2) |
| D3 | Q1: ficha da II-Br incompleta | Coleta Q1 bloqueada; preparação segue | Decisão/fonte do proponente (ver aprovação de 21/11) |
| D4 | Q3: mensuração sem autorização e com item repetido na fonte | Só prática educativa | Ficha Q3 |
| D5 | Q4: trabalho do Codex fora da `main` | Prática Q4 não está no candidato | Integração do Codex por PR |
| D6 | `dev`/`build:dev` do Lovable rodam contra o Lovable Cloud | Preview do editor usa o banco do projeto | Decisão de ambiente (registrada, não alterada) |
| D7 | `allowedInstruments` do Piloto = COPSOQ | Só afeta criação de ondas de pesquisa; a confirmar que não bloqueia a jornada Q2 | Prova da MO2 |

## 4. Árvore de decisão (0–10)

| Caminho | Valor | Segurança | Framework | Reuso | Custo | Complex. | Escala | Retrabalho (menos = maior nota) | Tempo até prova | Média |
|---|---|---|---|---|---|---|---|---|---|---|
| Jornada real mínima direto | 8 | 4 | 6 | 7 | 7 | 6 | 5 | 4 | 7 | 6,0 |
| Integrar todas as lentes antes de testar | 6 | 6 | 8 | 5 | 3 | 3 | 7 | 4 | 2 | 4,9 |
| **Ensaio sintético integrado** | 7 | 9 | 8 | 8 | 7 | 6 | 7 | 8 | 7 | **7,4** |
| Adiar só a operação bloqueada | 6 | 9 | 7 | 8 | 8 | 8 | 6 | 7 | 6 | 7,2 |
| Reutilizar integração existente | 6 | 7 | 6 | 9 | 8 | 7 | 6 | 6 | 8 | 7,0 |

**Escolha:** ensaio sintético integrado, sobre a integração Q1+Q2 já na `main` (reuso), primeira jornada completa pelo **Q2** (lente com melhor evidência: D10, ledger e revisão já provados), e as demais lentes adiando só a operação bloqueada. **Dependência concreta que muda a ordem:** D1 precede qualquer convite real; a MO2 prova o convite com o código de `fix/assentos-administrativos` numa pilha descartável.

## 5. Matriz do piloto (lente × fase × papel)

Fases: Mensurar · Educar · Transformar · Evoluir. Perspectivas Eu/Nós/Liderança/Organização. Permissões vêm do servidor (`requireOrgAdmin`, `resolveOrgMembership`, `module-access.server.ts`), não do seletor de persona.

| Lente | Fase | Papel | Operação | Origem do dado | Evidência hoje | Decisão pendente | Próximo passo |
|---|---|---|---|---|---|---|---|
| Q1 | Mensurar (preparação) | RH | Comunicado, controles, delegação, revisão técnica | Organização (real) | Ensaio Alfa/Beta, 2 PDFs (CHECKPOINT 18/11) | Ficha II-Br; responsável SST | Reverificar no candidato (MO3) |
| Q1 | Mensurar (coleta) | Colaborador | Responder | — | `checkModule` retorna `method_pending` | Ficha completa + permissão | Bloqueado |
| Q2 | Educar/Transformar | RH, liderança, colaborador | Prática aprovada → plano → designação → execução → aprendizagem/revisão → devolutiva | Ledger/plano (real) | Ensaio local Alfa/Beta, integração `6eff411`, suíte SQL 18/18 | PIL-01..08 | **MO2: jornada inteira em pilha descartável** |
| Q3 | Educar | Colaborador | Prática Vitalidade 001 v0.2.0 | Conteúdo | Aprovada sem citação, escopo local | Extensão ao piloto | MO3 |
| Q3 | Mensurar | — | — | — | Bloqueado | Ficha e estatística | Bloqueado |
| Q4 | Educar | Colaborador | Prática de forças, devolutiva individual | Individual (privado) | Demo na `main`; prática do Codex fora | Contrato de visão de equipe | Integrar Codex por PR (MO3) |
| Q5 | Evoluir | Direção, RH | Síntese com origem, período, ação, evidência | Composição das lentes | Demo | Contrato do IVO; vínculos ESG por escopo | MO3, depois de Q2 real |
| Ajuda | Todas | Todos | Ajuda contextual Ondas 1–3 | Produto | Prévia Lovable | Publicação | Revisão do proponente |

## 6. Cinco cenários de ambiguidade

O prompt anterior não tem versão comparável contada; abaixo, o estado de cada cenário sem percentual.

| Cenário | Situação |
|---|---|
| Formulário aprovado, cálculo incompleto | **Resolvido:** a aprovação cobre desenho e preparação; só a coleta/publicação dependente fica bloqueada |
| Q2 pronto enquanto outra lente está bloqueada | **Resolvido:** Q2 avança sozinho; a lente bloqueada adia só a operação dependente |
| Leitura falha ou grupo < limiar | **Resolvido na Expedição**; pendente nas 4 telas de D2 (MO2) |
| Prévia atualizada, candidato não publicado | **Resolvido:** a prévia não é publicação; publicar exige comando |
| Convite depende de migration ausente | **Resolvido como regra** (migration antes do código, falha fechada); **decisão tomada:** autorização concedida e migration aplicada em 22/11 (função presente, permissões conferidas, fora do histórico de migrations); convite ponta a ponta ainda não testado |
