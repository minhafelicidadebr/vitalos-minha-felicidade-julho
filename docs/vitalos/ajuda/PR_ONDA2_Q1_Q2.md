**Título:** feat(ajuda): ajuda contextual Q1/Q2 — preparação, devolutiva coletiva e ações (onda 2)

**Base:** `feat/ajuda-contextual-voz-segura` (empilhado sobre o #53) · **Draft** · sem merge

## O que muda
- **Preparar Q1:** ajuda "O que acontece nesta preparação?". Ela diz que preparar não abre a coleta, que continua bloqueada pelo contrato de módulos. Cita os itens 6.2–6.3 do Manual do MTE.
- **Devolutiva coletiva Q2** (`MemberPlanFeedback`): ajuda "O que esta devolutiva mostra?". É uma leitura do grupo, sem resposta individual, e uma ação listada não é prova de melhora. A mesma ajuda aparece no Diário, que usa o componente.
- **Ações Q2:** ajuda "Como ler as evidências deste plano?", com o fluxo execução → aprendizagem → eficácia com protocolo. A liderança vê só as próprias ações.
- **Papel da ajuda:** vem da sessão real; `DGP_RH`, `DIRETOR` e `SESMT_SAUDE` foram mapeados só para a leitura.
- **Fontes do Q2:** só do produto. Q2 é Domínio A, então não cita NR-1. Não há estudo novo.
- **Gates intocados:** coleta, questionários, cálculos, migrations, RLS, flags e habilitações.

## Verificação
- **Código:** 5 testes novos. A suíte tem 4.626 testes passando e 4 falhas que já existiam no `main`. Build, `tsc`, paridade e varredura de segredos limpos.
- **Navegador sem sessão:**
  - `/ivo-integral/preparar-q1` a 390 px: o bloqueio de acesso continua, o diálogo abre com o foco no título e o foco volta ao ⓘ ao fechar.
  - `/ivo-integral/acoes` a 1280 px: o diálogo abre em duas colunas e não cita NR-1.
- **Não verificado:**
  - Ambiente real com sessão de RH, SST ou membro: não testado.
  - Teclado real e capturas: não observados, porque o painel do navegador estava oculto.

## Registro separado
O limite de "assentos administrativos" conta todos os perfis. A correção mínima proposta está em `docs/vitalos/decisions/ONBOARDING_ASSENTOS_ADMINISTRATIVOS_2026-11-21.md` e não foi aplicada.

Este PR não declara Q1, Q2, Q3 ou Q4 prontos para serviço real.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
