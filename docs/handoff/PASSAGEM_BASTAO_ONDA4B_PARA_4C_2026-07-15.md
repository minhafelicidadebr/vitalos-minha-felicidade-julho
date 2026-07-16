# Passagem de Bastão — FlorêncIA Onda 4B concluída → Onda 4C (NASCENTES_ATLAS)

> **Data:** 2026-07-15 · **Autor:** sessão Claude Code (Protocolo Fable-5) · **Status:** OFICIAL — fonte única de retomada entre contas
> **Uso:** na nova conta/sessão, digitar `/retomada-vitalos` (comando em `.claude/commands/`) — ele aponta para este documento.
> **Regra de ouro:** este documento descreve o estado no hash abaixo. Se a `main` avançou além dele, o `git log` recente prevalece sobre qualquer afirmação aqui.

---

## 1 · Estado do repositório (baseline congelado)

| Item | Valor |
|---|---|
| `main` | `8de62b0` — "Merge PR #4: FlorêncIA contextual copilot for Safe Voice" |
| PRs mergeadas | #1 (marca VitalOS) · #2 (hero copy) · #3 (launch config isolada) · #4 (FlorêncIA Onda 4B, 9 commits, 89 arquivos) |
| Branches de trabalho | todas removidas (local + remota) após merge |
| Gate | 2219 testes / 0 falhas · `bunx tsc --noEmit` limpo · `bun run build` verde · paridade de schema OK |
| Reproduzir baseline | `bun install && bun run gate` (gate = `bun test src` + `bun run parity` + `bunx tsc --noEmit`) |

A Onda 4B está **concluída tecnicamente, integrada e operacional** no primeiro recorte governado (Empresa × Liderança × Voz Segura). Falta apenas o aceite humano de UX (prompt pronto na seção 6).

## 2 · Classificação de maturidade da Onda 4B

| Camada | Classificação |
|---|---|
| Infraestrutura de Skills (`docs/ai/florencia-skills/`) | REAL |
| Context Envelope e Policy Gate (`src/engine/florencia/`) | REAL |
| Claim Registry (`src/domain/evidence/claim-registry.json`) | REAL para o recorte atual |
| Response Template (`prepare-safe-conversation-v1`) | REAL e determinístico |
| FlorenciaDrawer (`src/features/florencia/components/`) | REAL como componente integrado |
| Wiring Empresa × Liderança × Voz Segura (`/voz-segura`, Seção 5) | REAL |
| Conteúdo da orientação | **DEMO** |
| Persistência e ActionLog | **NÃO IMPLEMENTADOS** |
| LLM, RAG e embeddings | **NÃO IMPLEMENTADOS** |
| Capacidades `interpret_aggregated_results` / `transform_findings_into_action` / `create_educational_activity` / `register_next_step` | **PLANNED** (ver `docs/ai/florencia/CAPABILITY-MAP.md`) — nunca renderizam nem executam |
| FlorêncIA como fonte da evidência | **NÃO** — evidência permanece nos registries governados |

Identificadores canônicos do recorte ativo: CTA `CTA-PREPARE-CONVERSATION` · intent `prepare_conversation` · claim `CLAIM-EDMONDSON1999-VOICE-002` · Skill candidata `SKILL-CONVERSATION-FACILITATOR` · template `prepare-safe-conversation-v1` · rota `/voz-segura` · section `preparar-conversa` (o `trustGate` exige match byte-a-byte com `target_context` da claim).

## 3 · Armadilhas de ambiente conhecidas (não estão no CLAUDE.md)

1. **Colisão de preview com projeto irmão.** `vitalos-org-fable5` (mesmo template, no mesmo diretório-pai) usava a mesma config de preview `"vitalos-dev"` — o mecanismo resolve o nome globalmente e pode servir/reusar o servidor do projeto ERRADO. Isso causou um falso alarme de "404 em /voz-segura" que consumiu uma investigação inteira (nunca houve bug de roteamento). A config deste repo agora se chama **`vitalos-julho-dev`** (porta lógica 8081; a sandbox pode mapear para outra, ex. 8098). Antes de confiar em qualquer resultado de preview, confirmar a linha de comando do processo que escuta a porta (`Get-CimInstance Win32_Process`) — ela deve conter `vitalos-minha-felicidade-julho`.
2. **`src/routeTree.gen.ts`** é regenerado pelo dev server a cada switch/HMR e aparece como diff sujo. Sempre `git checkout -- src/routeTree.gen.ts` antes de commit/switch/rebase (o rebase falha com "unstaged changes" por causa dele). Nunca commitá-lo à mão. Parar o dev server antes de operações git em sequência.
3. **Flakiness pré-existente** em `src/engine/gamification/participation-store.test.ts` — falha ~1×/rodada cheia ocasionalmente. Protocolo acordado: registrar a primeira falha, rodar o teste isolado, repetir o gate UMA vez, não corrigir junto com outra entrega, não adicionar retry.
4. **Automação de navegador tem teto.** O Browser pane não fecha o Radix Dialog via Escape/clique (eventos sintéticos não-"trusted") e screenshots dão timeout na landing animada. Não é bug do produto — Escape/foco são cobertos por 40+ testes DOM (happy-dom + Testing Library, fundação em `src/test/setup-dom.ts`). Validar conteúdo via `javascript_tool`/`get_page_text`; comportamento de foco real exige verificação humana.
5. **Demo gate.** Rotas internas no preview exigem destravar o portão de demonstração (`src/app/shell/demo-gate.ts`, chave localStorage `vita-demo-gate`). Não é autenticação — ver comentários do próprio arquivo.
6. **Commits multi-linha sempre via heredoc** (`git commit -F - <<'EOF' … EOF`) — inline `-m` com backticks já corrompeu mensagem por interpolação de shell.

## 4 · Método de trabalho do founder (como as ondas funcionam)

- O founder envia **super-prompts numerados** por subetapa; a execução segue exatamente as etapas, sem ampliar escopo.
- **Reconhecimento antes de código** em toda subetapa nova: mapear arquivos/contratos reais e apresentar antes de editar.
- **Autorização explícita e fresca para cada push/merge/deploy** — autorização de uma etapa não vale para a seguinte.
- **Commits pequenos, isolados por preocupação**, gate verde antes de cada um; fluxo branch → PR → merge com autorização.
- Doutrina completa: `CLAUDE.md` (regras invioláveis, Engine ≠ Domínio, k-anon ≥ 5) e `docs/SKILL_MESTRA_FABLE5.md` (leitura obrigatória) — este documento não as duplica.

## 5 · Sequência oficial pós-4B (decisão do founder)

```
1. Verificação humana curta da Onda 4B
2. Registro formal do aceite visual e acessível
3. Início da Onda 4C — ponte NASCENTES_ATLAS
4. Somente depois avaliar ActionLog
5. Manter as quatro capacidades PLANNED inativas
```

Não iniciar ActionLog antes da ponte NASCENTES definir qual ação é registrável, com qual finalidade, qual evidência a sustenta e quais dados são proibidos.

## 6 · Prompt pronto A — validação humana da Onda 4B

O founder envia este prompt somente depois de abrir o app no navegador normal:

```
FECHAMENTO FORMAL — VALIDAÇÃO HUMANA DA FLORÊNCIA ONDA 4B

A Onda 4B já está integrada na main:

main: 8de62b0
testes: 2219/2219
gate: verde
rota /voz-segura: 200

Agora farei a validação humana direta no navegador comum.

Não altere código durante esta verificação.

CHECKLIST — DESKTOP

Na rota /voz-segura:

1. localizar o CTA:
   "Preparar uma conversa segura";

2. confirmar que ele está próximo ao contexto da Missão;

3. abrir o drawer;

4. confirmar:
   - FlorêncIA — Copiloto VitalOS;
   - assinatura institucional;
   - classificação Demo;
   - aviso Conteúdo demonstrativo;
   - summary;
   - cinco passos;
   - seis limitações;
   - próximo passo como texto;
   - ausência de botão fictício;
   - ausência de IDs internos.

CHECKLIST — INTERAÇÃO

Confirmar manualmente:

- abertura por clique;
- abertura por teclado;
- foco inicial dentro do drawer;
- foco preso no drawer enquanto aberto;
- fechamento por Escape;
- fechamento pelo botão;
- retorno de foco ao CTA de origem;
- navegação por Tab previsível;
- conteúdo rolável;
- botão de fechar sempre acessível.

CHECKLIST — RESPONSIVIDADE

Testar:

- 1440px;
- 1280px;
- 768px;
- 390px;
- 375px;
- aproximadamente 320–330px.

Confirmar:

- sem overflow horizontal;
- drawer dentro da viewport;
- texto legível;
- listas sem compressão;
- fechamento acessível;
- scroll interno;
- conteúdo não cortado.

CHECKLIST — TEMA E ACESSIBILIDADE

Confirmar:

- tema claro;
- tema escuro;
- contraste adequado;
- zoom do navegador em 200%;
- reduced motion;
- nenhum movimento contínuo;
- nenhuma informação dependente somente de cor.

CHECKLIST — SEGURANÇA

Confirmar que não aparece:

- nome de participante;
- resposta individual;
- claim ID;
- Skill ID;
- reasonCode;
- diagnóstico;
- promessa jurídica;
- promessa de confidencialidade absoluta;
- ActionLog;
- persistência;
- campo de chat;
- texto livre para prompt.

RESULTADO

Após minha inspeção, registrar uma destas classificações:

A. APROVADO
Nenhum problema visual ou funcional relevante.

B. APROVADO COM AJUSTE COSMÉTICO
Problema visual pequeno, sem risco de segurança ou funcionalidade.

C. BLOQUEADO
Falha de foco, fechamento, overflow, exposição de dados ou mensagem
enganosa.

Não fazer alteração, commit ou push antes de eu informar o resultado.
```

## 7 · Prompt pronto B — superprompt inicial da Onda 4C

Branch recomendada: `feat/nascentes-atlas-safe-voice-bridge`. A Onda 4C NÃO começa criando telas ou CTAs — começa pela arquitetura de rastreabilidade metodológica:

```
Evidence Registry → Claim → mecanismo → Nascente provisória → lente
→ papel → modo M.E.T.E. → Skill → template → intervenção possível
→ indicador → rastreabilidade ESG
```

Superprompt (o founder envia após o aceite humano):

```
NASCENTES_ATLAS — ONDA 4C
PONTE METODOLÓGICA GOVERNADA PARA VOZ SEGURA

CONTEXTO

A FlorêncIA Onda 4B foi integrada na main:

main: 8de62b0

Estado atual:

- Skills Registry: REAL;
- Context Envelope: REAL;
- Policy Gate: REAL;
- Claim Registry: REAL para Voz Segura;
- response template: REAL e determinístico;
- FlorenciaDrawer: REAL;
- wiring Empresa × Liderança × Voz Segura: REAL;
- conteúdo atual: DEMO;
- ActionLog: não integrado;
- LLM/RAG/embeddings: inexistentes;
- quatro capacidades adicionais: PLANNED.

OBJETIVO

Criar a ponte conceitual e contratual entre a evidência governada da
FlorêncIA e o NASCENTES_ATLAS, começando exclusivamente pelo caso:

Voz Segura
→ Liderança
→ Preparar uma conversa segura

Nesta execução, não criar ainda:

- UI nova;
- CTA novo;
- ActionLog;
- banco;
- migration;
- embeddings;
- RAG;
- LLM;
- inventário massivo;
- nova claim;
- nova Skill;
- novas capacidades;
- ativação das quatro capacidades PLANNED.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. TREE OF THOUGHTS — ALTERNATIVAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Avaliar pelo menos quatro caminhos:

A. NASCENTES apenas como taxonomia documental

B. NASCENTES como registry operacional separado

C. NASCENTES como metadado dentro de Claims ou Skills

D. NASCENTES como camada de ligação entre Evidence, Claim, Skill,
   M.E.T.E. e intervenção

E. NASCENTES como ontologia extensa com RAG

Para cada caminho, apresentar:

- benefícios;
- riscos;
- acoplamento;
- auditabilidade;
- impacto no runtime;
- risco de sobreengenharia;
- aderência ao estágio atual.

Não expor raciocínio privado detalhado.

Apresentar somente:

- alternativas;
- critérios;
- evidências;
- decisão;
- justificativa.

A hipótese prioritária é o caminho D, mas não assumi-lo sem auditar
os contratos atuais.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. RECONHECIMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de editar, localizar:

1. evidence-registry.json;
2. claim-registry.json;
3. skill-registry.json;
4. method-registry.json;
5. CTA-PREPARE-CONVERSATION;
6. CLAIM-EDMONDSON1999-VOICE-002;
7. SKILL-CONVERSATION-FACILITATOR;
8. prepare-safe-conversation-v1;
9. modos M.E.T.E.;
10. lentes EU, NÓS, LIDERANÇA e ORGANIZAÇÃO;
11. classifications REAL/PARCIAL/DEMO;
12. contratos de versionamento;
13. testes de paridade;
14. manifestos e checksums;
15. quaisquer documentos NASCENTES_ATLAS existentes;
16. nomes provisórios de Nascentes v0.9;
17. referências a mecanismos;
18. ActionLog atual;
19. indicadores ESG;
20. ligações já existentes entre claim, Skill e método.

Apresentar o mapa real antes de propor arquivos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. PRINCÍPIO CENTRAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NASCENTES não deve ser apresentada como:

- novo construto científico universalmente validado;
- diagnóstico;
- escala psicométrica;
- causalidade comprovada;
- substituto da evidência;
- substituto da claim;
- nova taxonomia normativa;
- classificação individual.

NASCENTES deve funcionar, inicialmente, como:

"camada metodológica provisória que organiza mecanismos, capacidades,
lentes, modos M.E.T.E. e intervenções possíveis."

Usar nomenclatura:

NASCENTES_ATLAS v0.9
Status: PROVISÓRIO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. PRIMEIRO CAMINHO CANÔNICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mapear exclusivamente:

Evidence:
EDMONDSON-1999

Claim:
CLAIM-EDMONDSON1999-VOICE-002

Mecanismo:
segurança psicológica / redução de julgamento antecipado no relato de
erros, riscos ou preocupações

Nascente:
usar apenas nome provisório já existente no Atlas, caso haja um
mapeamento legítimo

Lente:
LIDERANÇA

Modo M.E.T.E.:
EDUCAR ou TRANSFORMAR, conforme contrato atual

Skill:
SKILL-CONVERSATION-FACILITATOR

Template:
prepare-safe-conversation-v1

Superfície:
Voz Segura

Segmento:
Empresa

Papel:
Liderança

Classificação:
DEMO para o conteúdo atual

Não inventar uma nova Nascente somente para preencher o mapa.

Caso não exista correspondência adequada:

- registrar UNMAPPED;
- propor candidata;
- manter como provisória;
- não ativar no runtime.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. CONTRATO CONCEITUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Avaliar um contrato mínimo como:

NascentesBridgeEntry {
  bridgeId
  evidenceIds
  claimIds
  mechanismIds
  nascenteIds
  lensIds
  roleIds
  meteModes
  skillIds
  templateIds
  ctaIds
  routeIds
  indicatorIds
  esgRefs
  classification
  status
  limitations
  version
}

Não implementar esse contrato automaticamente.

Primeiro verificar:

- tipos existentes;
- registries existentes;
- convenções de IDs;
- necessidade real de runtime;
- possibilidade de começar documentalmente.

Não duplicar dados canônicos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. DECISÃO DOCUMENTAL OU OPERACIONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Avaliar se a primeira versão deve ser:

A. documento:

docs/ai/nascentes-atlas/SAFE-VOICE-BRIDGE.md

ou:

B. registry versionado:

src/domain/nascentes/nascentes-bridge-registry.json

Só escolher registry operacional se houver:

- consumidor real;
- schema;
- validação;
- teste de paridade;
- versionamento;
- regra de atualização;
- benefício imediato.

Evitar criar JSON órfão no runtime.

A tendência preferencial para esta primeira subetapa é documental,
salvo evidência contrária.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. ACTIONLOG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Não integrar ActionLog.

Apenas definir:

- quais eventos futuros poderiam ser registrados;
- quais dados seriam permitidos;
- quais dados seriam proibidos;
- finalidade;
- retenção;
- classificação;
- vínculo com o ciclo.

Permitido futuramente:

- orientação aberta;
- roteiro revisado;
- próximo passo escolhido;
- ação marcada como planejada;
- ação marcada como realizada;
- timestamp;
- papel, nunca nome;
- IDs operacionais não sensíveis.

Proibido:

- conteúdo da conversa;
- falas;
- nomes;
- acusações;
- respostas individuais;
- inferências;
- dados clínicos;
- texto livre sensível.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. CRITÉRIOS DE ACEITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A subetapa será aprovada se:

1. não criar nova claim;
2. não criar nova Skill;
3. não inventar evidência;
4. não declarar causalidade;
5. não ativar Nascente sem correspondência;
6. preservar DEMO;
7. separar Domain A e Domain B;
8. manter FlorêncIA fora do papel de fonte da evidência;
9. não criar runtime órfão;
10. não implementar ActionLog;
11. não ativar capacidades PLANNED;
12. produzir rastreabilidade auditável;
13. declarar limites;
14. manter NASCENTES_ATLAS v0.9 como provisório.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. ENTREGA DE RECONHECIMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de editar, apresentar:

1. mapa dos registries;
2. mapa do primeiro caminho;
3. Tree of Thoughts resumido;
4. alternativas;
5. decisão recomendada;
6. Nascente existente ou UNMAPPED;
7. modo M.E.T.E. recomendado;
8. lente;
9. riscos;
10. diff previsto;
11. decisão documental versus operacional;
12. plano para ActionLog futuro;
13. testes necessários;
14. arquivos que não serão alterados.

Não escrever código nesta primeira execução.

Aguardar autorização explícita.
```

## 8 · O que NÃO fazer sem nova autorização do founder

- Integrar ActionLog ou qualquer persistência de FlorêncIA.
- Ativar qualquer das 4 capacidades PLANNED.
- Introduzir LLM, RAG ou embeddings.
- Criar claims, Skills, CTAs ou intents novos.
- Push/merge/deploy — cada um exige autorização explícita e fresca.
- Tocar o projeto irmão `vitalos-org-fable5` (inclusive matar processos dele sem confirmar linha de comando).
- Corrigir a flakiness de `participation-store.test.ts` misturada a outra entrega.

## 9 · Pendências secundárias (fora da sequência principal)

- **Fase 1b lote 2+** — verificação B2 do restante de Job Security + Employee Voice + Operational Design (expansão do Evidence Registry além dos 46 estudos congelados). Em pausa, sem prazo.
- Verificação humana completa de foco/reduced motion/responsividade da FlorêncIA (coberta pelo Prompt A da seção 6).
