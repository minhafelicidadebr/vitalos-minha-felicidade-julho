# Superprompt · Ajuda contextual com evidências · v2 · 21/11/2026

> Revisão da v1, recebida como `SUPERPROMPT_AJUDA_CONTEXTUAL_EVIDENCIAS.md`. Mantém a intenção: quem usa o VitalOS entende o que vê, por que importa, o que pode fazer no seu perfil e em que fonte a explicação se apoia.
>
> Base de execução: `origin/main` @ `5e25fa1`. A v1 citava `002bb1e`, o mesmo conteúdo antes do merge do PR #52.

## 0. O que mudou da v1 para a v2 (cinco melhorias de alto impacto)

| # | Melhoria | Por que importa |
|---|---|---|
| M1 | **Regra de formato por tipo de dúvida**, com árvore de decisão (§2). | A v1 listava quatro formatos sem dizer quando usar cada um. Com a regra, duas pessoas escolhem o mesmo formato para a mesma dúvida. |
| M2 | **Contrato editorial executável**: tipos e validador no motor, conteúdo versionado no domínio e evidência só por resolver (§4). | A v1 descrevia campos. Na v2, um teste recusa a entrada quando falta fonte de produto, quando há estudo fixado à mão ou quando aparece termo de promessa. |
| M3 | **Escrita por papel com fallback explícito**: a variação `geral` é obrigatória, e o papel só ganha texto próprio quando muda a tarefa ou o que ele pode consultar. | A v1 pedia variações por papel, mas não evitava cinco textos quase iguais. |
| M4 | **Estados da tela como parte da ajuda**: a mesma pergunta responde diferente em demonstração, carregando, indisponível, zero, um ou vários ciclos. A informação essencial aparece na tela, e o diálogo aprofunda. | Na Expedição, a v1 pedia isso só para o diálogo. A auditoria achou o defeito na própria tela, onde carregar e falhar apareciam como "sem exposição medida". |
| M5 | **Prova de compreensão com tarefas comparáveis** (§7), com o que foi medido e o que ainda é hipótese. | A v1 citava utilidade sem um protocolo repetível. |

## 1. Missão

Em cada ponto de dúvida do dashboard empresarial, a ajuda:

1. responde à pergunta prática;
2. explica o papel daquela atividade na jornada;
3. diz o que **este perfil** pode fazer agora;
4. mostra de onde vem cada parte da explicação, quando a fonte permite.

O VitalOS usa a linguagem, as permissões e as capacidades reais da branch e do ambiente em uso. Nenhuma ajuda promete efeito, conformidade ou diagnóstico.

## 2. Decisão de formato (ToT)

**Ramos comparados**, com notas de 1 a 5 (5 é melhor):

| Formato | Clareza da próxima ação | Risco de interpretação controlado | Celular e acessibilidade | Fidelidade à evidência | Custo de manutenção | Quando usar |
|---|---:|---:|---:|---:|---:|---|
| Texto na própria tela | 5 | 5 | 5 | 3 | 4 | Informação necessária para **interpretar um número** ou **decidir participar**: origem demonstrativa, estado da leitura, supressão. |
| Expansão em linha | 4 | 4 | 4 | 3 | 4 | Definição curta de um termo, quando o leitor continua na mesma tarefa. |
| Botão ⓘ com diálogo | 4 | 4 | 4 | 5 | 3 | Dúvida que precisa de exemplo por papel, fluxo e fonte com alcance. |
| Link ao Guia ou à fonte | 2 | 3 | 3 | 5 | 5 | Quem quer aprofundar. Nunca como única resposta. |
| Nenhuma ação adicional | — | — | — | — | 5 | O rótulo já responde, ou a dúvida se repete em vários cards. Nesse caso, a ajuda vai junto ao título da seção. |

**Regra:**
- O que muda a leitura de um número ou uma decisão fica **visível na tela**.
- O que precisa de exemplo e fonte vai para o **diálogo**.
- O link fica **dentro** do diálogo.

**Trade-offs aceitos:**
- O diálogo custa um clique. Por isso a origem demonstrativa também aparece na tela.
- O conteúdo editorial exige curadoria e revisão humana. Em troca, é versionado, testável e igual para todos.
- A geração a cada clique foi descartada: não é revisável e não cabe no fluxo de aprovação de claims.

## 3. Auditoria (como executar)

Use a matriz em `MATRIZ_AUDITORIA_AJUDA_2026-11-21.md` como planilha de cobertura. Cada linha registra:
- rota e componente;
- papel e prova de acesso;
- pergunta do usuário;
- origem do dado e estado;
- risco de interpretação;
- formato escolhido;
- fonte;
- aceite;
- forma de verificação: estática, navegador, bloqueada ou fora do escopo.

**Regras de cobertura:**
- **Um card ganha ajuda própria** quando tem pergunta distinta, erro previsível de leitura ou consequência de ação.
- **Cards com a mesma dúvida** compartilham uma ajuda junto ao título da seção.
- **Papel demonstrativo** (`vita-persona`) é recurso de leitura, não autorização. O acesso continua no servidor.

## 4. Contrato editorial (implementado)

| Peça | Arquivo | Papel |
|---|---|---|
| Tipos, seleção e validador | `src/engine/help/contextual-help-engine.ts` | Seleção determinística por ponto × papel × estado. `validateHelpEntry` recusa a entrada sem fonte de produto, com estudo fixado à mão ou com termo de promessa. |
| Resolver de evidência | mesmo arquivo, `createHelpEvidenceResolver` | Compõe `resolveStudy` → `findClaimForContext` → `trustGate`. Só devolve estudo quando há claim para o contexto **exato**. SST não tem papel no Claim Registry e fica sem estudo. |
| Conteúdo v0.1.0 | `src/domain/help/contextual-help.ts` | Pergunta, resumo, aviso de demonstração, variações por papel, fluxo, estados, limites, fontes rotuladas, vínculo de evidência, revisão. |
| Candidatas sem claim | `HELP_EVIDENCE_CANDIDATES` (mesmo arquivo) | Ficam fora da tela, para a curadoria. |
| Interface | `src/features/help/ContextualHelp.tsx` | Acionador ⓘ (44 px, nome acessível igual à pergunta) e diálogo em três camadas. |

**Rótulos de natureza da fonte:** "Como funciona no VitalOS", "Orientação oficial" e "Estudo científico". O rótulo vai ao lado da frase sustentada, com "Sustenta:" e localizador (item, página).

**Regras que não mudam:**
- `safe_claim` vai textual ou mais fraco.
- Os registros congelados não são alterados.
- Um estudo presente na base não libera um uso novo.
- O Playbook serve só para localizar referências na curadoria (GOV-01): nenhum texto dele entra no app.

## 5. Experiência e direção de arte

**Card:**
- Ordem fixa: ícone, título (`h2`) e pilar, ⓘ no canto do título, propósito, contagem "no exemplo" e ação principal.
- Participar tem 44 px e rótulo próprio, separado do ⓘ pela posição e pela forma (botão cheio, ou ícone redondo).

**Diálogo em três camadas:**
1. **Resposta curta**: título igual à pergunta, resumo, aviso de demonstração com ícone de frasco.
2. **"Na sua função"**:
   - seletor de perspectiva, que só muda a leitura (o perfil ativo é marcado "seu perfil");
   - exemplo concreto, próximo passo e link interno quando o passo acontece em outra rota;
   - fluxo Ouvir → Combinar um retorno → Acompanhar, com quem atua.
3. **"Fonte e alcance"**: expansão com `aria-expanded`. Traz as fontes rotuladas e o aviso de estudo em revisão quando falta claim. A linha de revisão editorial fica no fim.

**Comportamento:**
- **Foco:** vai ao título ao abrir, Tab fica preso no diálogo, Escape fecha e o foco volta ao ⓘ.
- **Botão Fechar:** explícito, com 44 px.
- **Movimento:** com `motion-reduce` e com a classe `a11y-reduce-motion` do app, o diálogo entra sem animação.

**Duas composições comparadas** (decisão):
- **A · coluna única** (celular, até 767 px). Leitura linear: resposta → função → fluxo → limites → fonte.
- **B · duas colunas** (768 px ou mais): à esquerda função e fluxo, à direita limites e fonte, em linhas de até ~62 caracteres.
- **Escolhida: B a partir de 768 px, A abaixo.** Nas capturas de 768 e 1280 px, "Qual é meu papel?" e "Onde confiro a fonte?" ficam na mesma dobra. Em 320 px, A é a única que não comprime o texto.
- **Correção da primeira versão:** o cabeçalho fixo ocupava quase todo o diálogo em 320 px. Agora todo o conteúdo rola junto.

## 6. Ordem de trabalho

1. Matriz auditada e uma decisão por ponto.
2. Fatia **Embaixadorias → Guardiões da Voz Segura**, com prova no navegador.
3. **VIA-T** "Como ler este resultado?" e **Expedição** "Como a prioridade é definida?", no mesmo padrão.
4. Próximas ondas, na prioridade da matriz:
   - Preparar Q1;
   - jornada Q2 (Ações e devolutiva);
   - Relatório Global, Relatórios e Selo;
   - Diário e Q3 demo.
5. Cada nova fonte científica passa pelo fluxo de claim, com descongelamento formal e parecer humano, antes de aparecer na tela.

## 7. Como medir "até 120 %"

"Até 120 %" é ambição de projeto, não resultado.

**Tarefas comparáveis**, as mesmas antes (`5e25fa1`) e depois:

| ID | Tarefa | Acerto |
|---|---|---|
| T1 | "Para que serve Guardiões da Voz Segura?" | Menciona prática voluntária de escuta e retorno. |
| T2 | "O que você pode fazer nesta frente, no seu perfil?" | Cita o próximo passo do seu papel. |
| T3 | "Clicar em Participar registra sua adesão na empresa?" | "Não, é demonstração." |
| T4 | "Onde você confere a fonte desta explicação?" | Abre "Fonte e alcance" e identifica a natureza da fonte. |
| T5 | Na Expedição: "Esta tela já diz se a medida funcionou?" | "Não. Recuo é evolução observada, e eficácia exige acompanhamento (Manual, 11.4.4)." |
| T6 | No VIA-T: "O que quer dizer Força Assinatura?" | "Média de 8,5 ou mais nos itens daquela força." |

**Métricas por perfil:**
- acerto sem ajuda;
- tempo até achar a orientação, contado do primeiro clique até a resposta;
- erros de interpretação.

**O que foi medido nesta entrega:**
- Só a verificação técnica: o caminho de cada tarefa existe e funciona no navegador.
- **Nenhum participante foi testado.** O ganho de compreensão continua como hipótese de design até uma rodada com pessoas autorizadas.
