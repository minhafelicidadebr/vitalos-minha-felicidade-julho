# Roadmap incremental

Preserva funcionalidades verdes; nenhuma reconstrução ampla.

| Incremento | Conteúdo | Estado |
|---|---|---|
| R0 | Baseline e inventário de ativos (`docs/vitalos/baseline-inventory.md`) | Concluído |
| R1 | Constituição, ADR-004, specs | Concluído |
| R2 | Contrato de lente, matriz 4×4 (engine puro), catálogo de lentes, registro de mapeamentos | Concluído |
| R3 | Adaptador FIB-T → leitura normalizada; leitor FIB-T sem identidade de cliente | Concluído |
| R4 | Componente da matriz 4×4 (estados honestos, acessível) | Concluído |
| R5 | Rota `/ivo` integral: shell executivo com matriz + Q2 real autenticado | Próximo |
| R6 | Proveniência lente→ação: `action_items` referenciando leitura publicada (migration local + testes SQL) | Planejado — escrita remota é gate |
| R7 | Linha do tempo de aprendizagem sobre `action_log`/`victory_records` | Planejado |
| R8 | Visão de governança metodológica (versões, mapeamentos, status) | Planejado |
| R9 | Demonstração com organização fictícia local | Planejado |
| R10 | COPSOQ, PERMA+V, VIA-T como adaptadores — cada um com spec própria | Gate metodológico |

Gates metodológicos abertos: C1–C7 em `methodology-governance.md`.
