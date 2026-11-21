# Guia da Jornada Empresarial · prova da fatia Q2 · 20/11/2026

Branch `feat/claude-ciclo-relatorio`. Referência: `GUIA_JORNADA_EMPRESARIAL_V2_1.md` (com o ajuste de sequência: a fatia começa pela entrada da liderança no painel).

## Ambiente

- Pilha descartável `vitalos-q1q2-integ`:
  - endereços verificados antes de qualquer escrita: API 127.0.0.1:57921, banco 127.0.0.1:57922, correio 127.0.0.1:57924;
  - 71 migrations aplicadas.
- App local em `http://localhost:8098`:
  - `VITALOS_RUNTIME_ENV=local`;
  - capacidade local `ACTION_PLAN`;
  - acesso editorial do guia com **segredo de teste** gerado na sessão, que fica fora do repositório.
- Dados fictícios inseridos só nessa pilha:
  - organização "Centro de distribuição Serra Azul (fictício)";
  - usuários `rh@`, `lider@`, `colab@` e `sst@serra-azul.test`;
  - Q2 habilitado (depois também o Q1);
  - onda FIB-T e setor Expedição com cápsula publicada sintética;
  - plano 2026-T4 ativo, com uma ação atribuída à liderança.
- Logins feitos por link mágico do correio local.
- Stack institucional e pilha do Codex não foram tocados.
- A pilha foi desmontada ao final.

## Provado no navegador

| Prova | Resultado observado | Critério |
|---|---|---|
| Liderança pelo painel | `/ivo-integral` → "Guia da minha jornada" → "Seu trabalho agora": "Q2 · Transformar como Liderança"; próxima entrega "Alinhamento de 10 minutos na troca de turno · até 12/2026"; "O que registrar"; "Quem usa o registro: o RH, na revisão". CTA "Registrar o que aconteceu" → `/ivo-integral/acoes`, que mostra a ação sob responsabilidade da liderança. | AC-04, AC-06 |
| Outra lente habilitada | Com Q1 **e** Q2 habilitados na organização, o card continua na ação do Q2; Q1 não desloca a tarefa. | AC-04 |
| Colaborador | "Seu momento no ciclo · Q2"; CTA "Ver a devolutiva da equipe" → `/ivo-integral/q2`, que mostra título, setor, fator, estado, prazo e "Eficácia ainda não avaliada", sem responsável. | AC-08 |
| Colaborador troca para a perspectiva RH | A URL fica `?perfil=rh`; a etapa Q2 é mantida; o foco vai para o texto do perfil; só aparece "Ver como funciona nesta etapa", sem CTA de RH. | AC-07 |
| Colaborador por URL direta | `/ivo-integral/acoes` → "Acesso não autorizado"; a ação não aparece. | AC-07 |
| SST | `/ivo-integral/q2` → leitura por setor negada e devolutiva coletiva visível, sem responsável. Guia: "Você acompanha", CTA só para a devolutiva. | AC-11 |
| Visitante | `/guia-empresarial` sem senha → formulário. O HTML da página não traz o caso; `GET /api/guia` → 401 com `no-store`; nenhum dos 241 scripts carregados contém o texto do caso. Senha incorreta → "Senha não reconhecida". Senha de teste → abertura com os três blocos, chips de estado, linha de cobrança e aviso; cookie HttpOnly (invisível ao script). | AC-03, AC-09 |
| Continuidade Q2 → Q5 | "Ver a jornada por perfil" → Q2 / RH. Troca para Colaborador; "Que evidência fica?" abre em linha. Q5 mantém a perspectiva e mostra o extrato com os quatro tipos e o aviso de dado sintético. Checagem 2: erro plausível e acerto com o feedback escrito. | AC-12 |
| Diálogo | "Ler o caso inteiro" abre com o foco dentro, rolagem própria e fundo travado; Escape fecha e devolve o foco ao acionador. | AC-13 |
| Larguras | 320, 390, 768 (tablet retrato) e 1024 (paisagem): largura de rolagem igual à da janela, sem rolagem horizontal. Em 320, as etapas Q1–Q5 e o seletor ficam em duas linhas compactas e fixas. | AC-13 |

## Coberto só por testes

- **Expiração da sessão editorial e configuração ausente** (`guide-access.server.test.ts`).
- **Resolvedor:**
  - etapa sem tarefa;
  - duas ações sem prioridade levam ao mapa;
  - contexto ausente leva ao mapa;
  - prioridade reconhecida desempata (`guide-entry.test.ts`).
- **Montagem do contexto no servidor por papel** (`guide-context.server.test.ts`).
- **Conteúdo:**
  - matriz completa;
  - termos proibidos;
  - abertura;
  - limites por lente;
  - o conteúdo nunca entra em módulo de cliente (`enterprise-guide.test.ts`).

## Limites

- **Movimento reduzido:** não foi emulado no navegador. A única transição própria do guia (a seta da expansão) usa `motion-reduce:transition-none`; as animações do diálogo vêm do componente base.
- **Tela inteira:** o guia não tem modo de tela inteira.
- **Fotografia:** não há ativo aprovado no repositório para a cena da troca de turno. O guia usa marca, ícones e composição; a foto segue como brief da V2.1 §12.
- **Validação com pessoas:** pendente.
- **Sessão editorial:** continua em memória num só processo (decisão pendente para o ambiente de destino).
