# NASCENTES v0.9 · Fase 1a — Deduplicação Canônica por DOI

**Data:** 2026-07-14 · **Método:** chave primária = DOI extraído do campo `DOI/ID`; fallback = título normalizado (sem acento/pontuação) + ano; cross-merge título→DOI. Executado sobre as 399 ocorrências da aba `02_References` da Biblioteca Master Plus v3.
**Confirma e amplia o achado F-013 da Fase 0.**

---

## Números canônicos (substituem as contagens anteriores)

| Métrica | Biblioteca v3 declarava | Canônico por DOI |
|---|---|---|
| Ocorrências | 399 | 399 ✓ |
| Grupos de duplicata | 25 (50 linhas) | **30 (66 ocorrências)** |
| Estudos únicos | ~374 implícito / "33 verificados" | **363** (362 se DUP-015 for confirmado manualmente) |
| Estudos únicos verificados V1/V2 | 33 declarado / 30 na minha contagem manual | **32** — divergência da Fase 0 resolvida |

## Achado F-013 (ampliado) — grupos de duplicata que a biblioteca perdeu

**8 grupos inteiramente sem marca `DUP-*`:**

| Ocorrências | IDs | Estudo |
|---|---|---|
| 4× | APP-009, SUP-011, FLX-008, AUT-004 | "Does a Flexibility/Support Organizational Initiative Improve…" |
| 3× | VOI-031, OPD-008, WLP-036 | "A cluster randomized trial of interventions to improve work…" |
| 2× | MGT-005, STR-006 | Daniels et al. 2017 — job design review (**âncora do piloto das Nascentes** — contava como 2) |
| 2× | MGT-012, VOI-026 | "Using Kaizen to improve employee well-being…" |
| 2× | LDR-017, AUT-001 | "Transformational leadership and autonomy support management…" |
| 2× | FLX-001, FLX-010 | Mas & Pallais 2017 (já suspeitado na Fase 0) |
| 2× | VOI-025, VOI-030 | "The effects of dialogue groups on physicians' work environment…" |
| 2× | OPD-009, WLP-034 | "Organisational intervention to reduce occupational stress…" |

**2 grupos parcialmente marcados** (membros faltando):

- `DUP-002` (Kelly/Moen 2014 STAR): marcados APP-008, SUP-010 — **faltam AUT-005, WLP-037**
- `DUP-014` (Edmondson 1999): marcados LDR-013, VOI-005 — **falta TRU-006** (o F-013 original)

**1 grupo em disputa** (biblioteca provavelmente certa; metadados incompletos):

- `DUP-015` (MGT-003 + LDR-005, "Leadership development as an intervention…"): mesmo título, mas MGT-003 está **sem DOI** e com metadados levemente divergentes — o método canônico os separa. Correção: retro-preencher o DOI `10.1080/02678373.2010.518441` em MGT-003 e confirmar o grupo.

## Implicações

1. **Nenhum estudo do piloto das Nascentes muda de cluster** — as duplicatas descobertas reforçam nós existentes (Daniels 2017 e Mas & Pallais viram 1 nó cada, com mais arestas de driver de origem). O padrão se repete: estudos multi-driver no deck são exatamente os que o modelo de grafo resolve melhor.
2. **A contagem de referência para o gate v1.0 muda**: a meta "≥120 estudos únicos B2" agora se mede contra **363 únicos totais** (não 399) — cobertura atual real: 32/363 ≈ **8,8%**.
3. **Correções a aplicar na planilha-fonte** (founder ou próxima sessão, na própria Biblioteca v3 → v3.1): criar `DUP-026`…`DUP-033` para os 8 grupos perdidos; completar `DUP-002` e `DUP-014`; retro-preencher DOI de MGT-003. Até lá, este documento é a referência canônica de dedup.

## Fase 1b (pendente — sessão dedicada recomendada)

Verificação independente B2 dos não-verificados, na ordem de prioridade da Fase 0 (§5): Job Security (60 refs/4 verif), Workload Pressures (41/3), Employee Voice (39/1), Operational Design (37/3), Autonomy (32/2). Cada verificação registra tipo de acesso honesto (metadados/resumo/integral) — nunca afirmar leitura integral quando só o resumo foi conferido.

```text
STATUS FASE 1a
Ocorrências processadas: 399
Estudos únicos canônicos: 363 (362 se DUP-015 confirmar)
Grupos de duplicata: 30 (8 novos + 2 completados + 25 da biblioteca, 1 em disputa)
Verificados V1/V2 únicos: 32 (divergência 30 vs 33 resolvida)
Cobertura de verificação: 8,8% — gate v1.0 exige ≥120 (33%)
Correções para a Biblioteca v3.1: 11 (8 grupos novos + 2 complementos + 1 DOI)
Próximo: Fase 1b — verificação B2 em fonte primária, começando por Job Security
```
