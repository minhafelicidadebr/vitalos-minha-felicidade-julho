# Roadmap incremental

Preserva funcionalidades verdes; nenhuma reconstrução ampla.

| Incremento | Conteúdo | Estado |
|---|---|---|
| R0 | Baseline e inventário de ativos (`docs/vitalos/baseline-inventory.md`) | Concluído |
| R1 | Constituição, ADR-004, specs | Concluído |
| R2 | Contrato de lente, matriz 4×4 (engine puro), catálogo de lentes, registro de mapeamentos | Concluído |
| R3 | Adaptador FIB-T → leitura normalizada; leitor FIB-T sem identidade de cliente | Concluído |
| R4 | Componente da matriz 4×4 (estados honestos, acessível) | Concluído |
| R5 | `/ivo-integral` + `/ivo-integral/q2`: leitura Q2 autenticada no servidor, estados distintos, navegação IVO ↔ Q2 | Concluído e testado localmente (Supabase local, sessões reais). Não deployado. |
| R6 | Recorte mínimo: resultado publicado → prioridade → ação → evidência de execução → aprendizagem (`/ivo-integral/acoes`) | Concluído e testado localmente. Migration `20261002120000` **preparada para revisão, não aplicada** em nenhum ambiente remoto. |
| R7 | Linha do tempo de aprendizagem sobre `action_log`/`victory_records` | Planejado |
| R8 | Visão de governança metodológica (versões, mapeamentos, status) | Planejado |
| R9 | Demonstração com organizações fictícias locais | Entregue como `demo:ivo:*` (ver `specs/ivo-platform-foundation.md`) |
| R10 | COPSOQ, PERMA+V, VIA-T como adaptadores — cada um com spec própria | Gate metodológico |

## Fora do recorte R6 (decisão consciente)

- Acrescentar ação a um plano já criado: o ledger congela o plano na criação e não há RPC de inclusão; exigiria função nova (M6A aborta função nova em `public`).
- Delegar responsável a outro membro: não há diretório de membros; o accountable é quem administra o plano (escopo S6 do ledger).
- Encerrar plano (`closed`): não há RPC.
- Eficácia: depende do gate C8.

## Gates

- Metodológicos abertos: C1–C8 em `methodology-governance.md`.
- Remotos: aplicar `20261002120000` em staging/produção; promover o módulo Action Plan (capability `ACTION_PLAN`) fora de fixture local; deploy das rotas IVO.
