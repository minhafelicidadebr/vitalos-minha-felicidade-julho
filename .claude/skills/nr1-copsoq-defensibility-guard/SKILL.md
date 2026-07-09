---
name: nr1-copsoq-defensibility-guard
description: Use whenever writing or reviewing copy, reports, dashboards, or features related to NR-1, COPSOQ II, psychosocial risk, PGR, GRO, or Domain B (risk) in this project (VitalOS) — prevents false compliance/legal-shield claims, clinical-diagnosis framing, individual risk ranking, and k-anonymity violations. Invoke for any text or feature touching occupational risk assessment language, even if not explicitly asked.
---

# NR-1 / COPSOQ II Defensibility Guard

Este projeto mede risco psicossocial ocupacional (Domínio B, NR-1/COPSOQ II)
lado a lado com florescimento (Domínio A, PERMA/IVO). A defensabilidade
técnica e jurídica do produto depende de NUNCA confundir os dois, e de nunca
prometer o que o produto não é. Ver `docs/instrumentos/COPSOQ_NR1.md` e
`docs/ARQUITETURA_CIENTIFICA.md` para a base científica completa antes de
qualquer módulo de mensuração novo.

## Sempre classifique o dado como um destes, e diga qual é

- **Real** — vem de uma cápsula agregada real (`wave_capsules`), k-anon já
  aplicado no servidor.
- **Demo** — mock determinístico, rotulado como demonstração na própria UI.
- **Mock** — dado de desenvolvimento sem pretensão de realismo.
- **Proxy** — um sinal usado como aproximação de outro (declare a
  aproximação, nunca finja que é o dado direto).
- **Hardcoded** — valor fixo no código; se aparece em tela como se fosse
  medido, é uma violação de honestidade (Fable5 §8) e deve ser corrigido, não
  documentado como "ok por enquanto".
- **Auditável** — tem linhagem rastreável até a fonte (onda → cápsula →
  fórmula), como no Dossiê ESG.

## Nunca permita (bloqueie a mudança e explique por quê)

1. Claim de **conformidade automática** com a NR-1 ("sua empresa está em
   conformidade" sem trabalho humano real por trás).
2. Claim de **laudo automático** — laudo/PGR é sempre assinado por
   profissional habilitado; o produto gera insumo, nunca o documento legal
   por si.
3. Claim de **blindagem jurídica** ("isso protege a empresa de multa/ação").
4. **Mistura entre bem-estar (Domínio A) e risco ocupacional (Domínio B)**
   na mesma tela, fluxo ou gráfico — são camadas estritamente separadas
   (CLAUDE.md invariante 6).
5. **Uso de dado individual para gestão** — resposta de uma pessoa nunca
   aparece para um gestor, mesmo agregada em n pequeno.
6. **Ranking de risco** entre indivíduos, times ou setores por "quem está
   pior" de forma competitiva/punitiva.
7. **Exposição de grupos pequenos** — qualquer corte com n < 5 fica oculto
   com microcopy explicando por quê (k-anonimato ≥ 5, CLAUDE.md invariante
   3; ≥10 em contexto mais sensível quando o pack exigir).
8. **Relatório sem critério, fonte e limitação declarados** — todo número
   mostra de onde veio e o que NÃO prova.
9. **Tratamento de COPSOQ como diagnóstico clínico** — é instrumento
   organizacional exploratório, não avaliação psicológica individual.
10. **Intervenção individualizante para problema organizacional** — se o
    dado aponta um problema sistêmico (ex.: carga de trabalho do setor), a
    ação sugerida é organizacional, nunca "fulano precisa de terapia".

## Sempre reforce

- k-anonimato como propriedade do ENGINE (marca `visible: false`, exclui do
  cálculo), nunca só da UI.
- LGPD: consentimento explícito onde aplicável, dado nunca reidentificável.
- Domínio A ≠ Domínio B, sempre, em dados/telas/fluxos.
- O ciclo completo: inventário → plano de ação → evidência → melhoria
  contínua — nunca "medir e parar".
- Participação dos trabalhadores como parte do método, não só da coleta.
- Comunicação clara, sem jargão como escudo.
- Limites metodológicos ditos em voz alta (correlação ≠ causalidade, tamanho
  de efeito honesto — "pequeno" quando é pequeno).

Se uma decisão tensionar velocidade de entrega contra qualquer item acima,
pare e pergunte — não resolva a favor da velocidade por conta própria.
