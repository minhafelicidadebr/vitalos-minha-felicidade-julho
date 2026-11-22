# PR #58 · descrição reconciliada (22/11/2026)

**Sem migration própria.** A migration `20261121120000_reserve_member_invite_atomic.sql` entrou na `main` pelo #57 (`425b4a9`). Este PR a carregava só por ancestralidade (merge da branch antiga `fix/assentos-administrativos`); com duas bases de merge, a comparação do GitHub usava `5e26e73` (antes do #57) e mostrava o arquivo no diff, com conteúdo idêntico ao da `main`. Em 22/11 a `main` (`09784aa`) foi mesclada nesta branch (`923d2b5`), sem reescrever histórico: o diff contra a `main` não contém mais nenhum arquivo em `supabase/`. **Mesclar este PR não aplica migration.** Não depende mais do #57 (já mesclado).

## O que este PR adiciona à `main`
- **D2 · falha fechada nas leituras de ciclo:** Board Brief, histórico, Reavaliação NR-1 e dossiê PGR devolvem estado indisponível em erro de leitura, nunca "nenhum ciclo" (teste de contrato com 5 chamadores).
- **Fundação Q3:** aviso de prontidão na visão IVO (sem mensuração), verificador de fonte PERMA+V (recusa sem ficha), pontuador não ligado, registros de decisão.
- **Roteiros da pilha descartável** (`scripts/integ-local/`): `reset.sh`, `app.ts`, `mo2-journey.ts` (54 verificações), `mail-link.ts`. Só loopback e dados fictícios.
- **Registros** em `docs/vitalos/piloto/`: MO2–MO4 e relatório de liberação de 22/11.

## Provas
- HEAD deste PR (`923d2b5` + só documentos de registro): gate 4686 pass / 0 fail em `923d2b5` (`main` + #58), paridade, `tsc`, secret-scan. Os commits posteriores alteram apenas `docs/`.
- Candidato integrado (`main` + #58 + #59 + #60): gate 4698/0 em `e70298b`; jornada Q2 54/0 em pilha descartável recriada.

## Para mesclar
Aprovação humana. Independe de #59 e #60.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
