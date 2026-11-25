# Prova · Guia Empresarial Q1–Q5 (consolidação)

Base: `main` remota `e0fa696`; Q2 de referência = PR #66 (`929d9eb`). Branch `feat/guia-empresarial-q1-q5`.

## O que mudou
- `GuideJourney.tsx`: o formato do Q2 virou o único `ProfileJourney` (navegação → cabeçalho com sobrelinha e fluxo → card do papel → ferramentas → colaboração → exemplo/proteção/mapa). Caminho genérico antigo removido.
- `enterprise-guide.ts`: textos finais de Q1, Q3, Q4, Q5 (seção 4 do super prompt), `journey` (fluxo, exemplo, evidência, checagem), `handoffs` por etapa, checagens novas.
- `guide-types.ts`: `labels`, `journey`, `handoffs`, `follow/also`, `opening.example`.
- `GuideOpening.tsx`: título/texto da abertura e bloco "Acompanhe um exemplo, da preparação à síntese".
- Navegação por etapa/perfil agora empilha histórico (antes `replace`), nas duas rotas.
- Sem mudança em autorização, registro de disponibilidade, migrations, Lovable ou dados.

## Verificação
- `bun test src`: 4513 pass / 0 fail; `tsc --noEmit` limpo.
- Matriz 5 lentes × 6 perfis: teste automatizado (`GuideJourney.test.tsx`) + percurso no navegador a 320 px (30 combinações, sem rolagem horizontal, blocos e voz corretos).
- Navegador (sessão editorial, servidor local inerte): voltar/avançar do histórico restaura etapa+perfil e foco no título; larguras 320/390/768/1024/1440.
- Capturas em `prova-q1-q5/`.
- Aceite dos 30 s: **meta de revisão** (inspeção; sem teste com pessoas).

## Frases para revisão
- Q5 Direção: o texto do super prompt ("defina/pactua os compromissos") foi suavizado porque a regra vigente trata a direção como leitora; papel segue "a definir".
- Q5 Liderança: "indique o que vale manter ou ajustar" sem capacidade operacional no registro.
- Q1 Colaborador: ver o comunicado dentro do app continua "a confirmar".
