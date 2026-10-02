# ADR-004: Estratégia de integração IVO — FIB-T como lente Q2

**Status:** Aceito · implementação incremental em `feat/ivo-fibt-platform-foundation`
**Data:** 2026-10-01
**Relacionado:** ADR-002 (Compor, não acumular) · `docs/vitalos/constitution/` · `docs/vitalos/specs/`

---

## 1 · Problema

A FIB-T foi validada tecnicamente (manifesto 32 itens, k=5, supressão
diferencial, liberação em lote, publicação protegida) para um cliente (ISG)
que não fará mais a pesquisa. O produto precisa de uma camada IVO que integre
quatro lentes trimestrais sobre quatro dimensões, sem perder o que já foi
validado e sem acoplar regra de produto a cliente.

## 2 · Alternativas

| Critério (peso igual) | A · FIB-T como app separado | B · Reconstruir IVO do zero | C · Camada IVO sobre contratos |
|---|---|---|---|
| Reutilização do código | média | baixa | **alta** |
| Fidelidade metodológica | alta | risco alto | **alta** |
| Tempo até valor | rápido | lento | **rápido** |
| Independência de cliente | baixa | alta | **alta** |
| Privacidade | preservada | a reprovar | **preservada** |
| Manutenção | duplicação | alta | **boa** |
| Integrar outras lentes | ruim | boa | **boa** |
| Risco de regressão | baixo | alto | **baixo** |
| Clareza para usuários | fragmentada | boa | **boa** |
| Custo operacional | 2 superfícies | alto | **baixo** |

## 3 · Evidências no repositório

- Dimensões `eu/nos/lideranca/organizacao` já existem (`ivo-framework.json`).
- Jornada Q1–Q4 COPSOQ → FIB-T → PERMA+V → VIA-T já é fonte única (`src/domain/journey.ts`).
- Ciclo M.E.T.E. e ledger de ações/evidências já existem (`season-engine.ts`, migration `20260705100000`), desligados no capability registry.
- A FIB-T tem seam natural de adaptador: engine puro com definição injetada (`FibtInstrumentDef`) e leitor de estado protegido (`ManagerAnalytics`).
- Não existe interface de adaptador por instrumento — lacuna que a Rota C preenche.
- O único acoplamento de produto a cliente fora da fronteira HML é a importação de `HML_SECTOR_SMOKE` pelo leitor FIB-T.

## 4 · Decisão

**Rota C.** Camada IVO em quatro peças, sem tocar no cálculo da FIB-T:

1. `src/engine/ivo/` (puro): contrato de lente, leitura normalizada, matriz 4×4.
2. `src/domain/ivo/` (domínio): catálogo de lentes derivado da jornada e registro versionado de mapeamentos lente→dimensão (vazio; só `APROVADO` alimenta células).
3. `src/lib/fibt/fibt-lens-adapter.ts`: converte o snapshot protegido da FIB-T em leitura normalizada, transportando estado e não número quando protegido.
4. Fronteira HML: identidade do lote injetada pela camada de acesso; o leitor de produto deixa de conhecer cliente.

O índice composto existente (`calculateIVO`) **não** é usado pela camada IVO.

## 5 · Consequências

- Novas lentes entram como adaptadores; o núcleo não muda.
- A matriz mostra estado e evidência, nunca número composto, até aprovação.
- Testes FIB-T existentes permanecem a linha de base de regressão.
- Riscos residuais: conflitos C1–C7 (`methodology-governance.md`); ledger de ações desligado até contrato de produção; formatos de `cycle_key` divergentes.
