# Missão — IVO · Índice de Vitalidade Organizacional

**Vitalidade que conecta pessoas, vínculos, liderança e sistema institucional.**
medir • aprender • transformar • comprovar

Status: VIGENTE · 2026-10 · substitui o foco "pesquisa para um cliente" (ISG) por
produto reutilizável. A ISG permanece apenas como registro histórico e fixture HML.

## Propósito

Dar a qualquer organização um ciclo anual em que cada instrumento trimestral
(lente) produz sinais agregados confiáveis que viram decisões, ações, evidências
e aprendizagem longitudinal. O VitalOS não termina no diagnóstico.

## Arquitetura conceitual

**4 dimensões × 4 lentes × 4 trimestres.**

| Dimensão (onde a vitalidade acontece) | id no código |
|---|---|
| EU — vitalidade da pessoa | `eu` |
| NÓS — qualidade dos vínculos | `nos` |
| LIDERANÇA — prática de gestão | `lideranca` |
| ORGANIZAÇÃO — sistema institucional | `organizacao` |

| Lente (como é observada) | Trimestre | id | Estado nesta fundação |
|---|---|---|---|
| COPSOQ | Q1 | `copsoq` | planejada |
| FIB-T | Q2 | `fibt` | **funcional** |
| PERMA+V | Q3 | `perma_v` | planejada |
| VIA-T | Q4 | `via_t` | planejada |

Os ids de dimensão são os mesmos já usados em
`src/domain/packs/enterprise/ivo-framework.json`; a ordem e o trimestre das
lentes são os de `src/domain/journey.ts` (fonte única da jornada).

## Públicos

RH e liderança (decisão e ação), comitês de saúde/SST (governança), alta
gestão (direção e prova), pessoas participantes (devolutiva coletiva). Nunca
avaliação individual.

## Problemas resolvidos

1. Diagnóstico que não vira ação. 2. Ações sem dono, prazo ou evidência.
3. Ciclos que não se comparam. 4. Instrumentos isolados sem visão integral.

## Limites éticos

- Nenhuma resposta individual é exibida; agregados abaixo de `k_min` não saem.
- Nenhum índice composto, peso, faixa ou benchmark sem aprovação metodológica.
- Nenhuma recomendação clínica nem diagnóstico individual.
- Resultados nunca alimentam avaliação de desempenho, promoção ou remuneração.

## Independência de cliente

Nenhuma regra de produto pode depender do nome, slug ou identidade de um
cliente. Identidades de lotes de homologação vivem só na fronteira de
deployment HML (`src/lib/fibt-hml/`) e em fixtures de teste.
