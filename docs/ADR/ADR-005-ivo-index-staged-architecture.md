# ADR-005: Índice IVO em etapas — perfil dimensional primeiro, número só com método aprovado

**Status:** Proposto (recomendação da macro-onda de 2026-10-05; aguarda aceite do responsável de produto e do metodológico)
**Data:** 2026-10-05
**Relacionado:** ADR-004 · `docs/vitalos/ivo-roadmap.md` · `docs/vitalos/ivo-methodology-dossier.md` · `docs/vitalos/specs/efficacy-protocol-c8.md`
**Origem:** relatório técnico de 2026-10-05 (estados relatados = evidência relatada; fórmulas, pesos e escalas = propostas).

## 1 · Problema

Entregar a cadeia FIB-T → quatro dimensões → índice IVO → prioridade → educação → ação → evidência →
avaliação de eficácia → nova mensuração, sem inventar associações, pesos, faixas ou validações, e sem
abrir caminho alternativo para respostas individuais.

## 2 · Alternativas

| Critério | A · Adaptar `calculateIVO` (0–1000) ao fluxo novo | B · Só perfil dimensional, sem número composto | C · Perfil dimensional agora + índice hierárquico versionado, publicável só com método aprovado |
|---|---|---|---|
| Validade metodológica | **Baixa**: pilares de pesquisa demonstrativa, n<k vira 3,0 neutro (C1), escala 0–1000 sem aprovação | Alta (nada a validar além dos nativos) | Alta: cada entrada é leitura nativa publicada + mapeamento aprovado |
| Reuso | Médio (motor legado, dados mock) | **Alto** (matriz, adaptador, ledger) | **Alto** (mesmos contratos; acrescenta motor e snapshot) |
| Privacidade | Risco: não passa pela publicação protegida | Preservada | Preservada; exige guarda de divulgação conjunta (PI-5) |
| Complexidade | Baixa agora, alta depois (dívida C1) | Baixa | Média (motor, snapshot, comparabilidade) |
| Tempo até entrega funcional | Rápido, porém com número indefensável | Rápido (cobertura e C8 já) | Rápido para o perfil e C8; número depende de D1–D7 |

## 3 · Decisão recomendada

**C**, em etapas: (1) perfil dimensional com cobertura explícita e estados honestos; (2) protocolo de eficácia
C8 independente do índice; (3) motor do índice **somente** com método aprovado, inicialmente como piloto
`v0.1` em staging. Enquanto isso, qualquer cálculo composto existe apenas como **índice experimental de
teste**, com parâmetros sintéticos, fora de rotas, servidor e componentes (guarda automatizada).

Justificativa: C é a única opção que entrega valor imediato (cobertura, lacunas, eficácia) sem antecipar
decisões metodológicas; A cria dívida (C1) e B deixa o IVO sem caminho de evolução.

## 4 · Consequências

- `calculateIVO` permanece legado e fora da jornada IVO (guarda existente mantida).
- Nenhuma célula, dimensão ou índice recebe número sem mapeamento `APROVADO` **e** método aprovado.
- Concluir ação não altera o IVO; eficácia é avaliação separada (C8).
- Aprovar método ≠ validar o índice: estados distintos (`rascunho → aprovado_para_piloto → validado_para_uso_definido → retirado`).
- Mudança de composição gera nova versão e exige análise de comparabilidade.
