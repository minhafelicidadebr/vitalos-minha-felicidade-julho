# Conferência · origem demonstrativa em /selo e /relatorios · 20/11/2026

Base `f8289c2`. Pilha descartável `vitalos-q1q2-integ` (guard ok: API 127.0.0.1:57921, DB 127.0.0.1:57922, correio 127.0.0.1:57924; 71 migrations). App em `http://localhost:8098` apontando para essa pilha. Usuário de teste `rh.selo@norte.test` (RH_ADMIN) na organização fictícia "Empresa Exemplo Norte (fictícia)", criados só nessa pilha; login por link mágico do Mailpit local. Stack institucional e pilha do Codex não tocados.

## /selo (sessão válida, RH)

| Onde | Observado | Contexto demonstrativo |
| --- | --- | --- |
| Cabeçalho | "PRÉVIA DEMONSTRATIVA · CERTIFICAÇÃO"; texto "dados atuais são demonstrativos e não representam uma certificação emitida" | presente |
| Status | "Nível calculado no exemplo · Em jornada · Regra demonstrativa, sem validade de certificação"; "Elegibilidade não atingida no exemplo" | junto ao resultado |
| Critério do Culture Lab | seção "ESSENCIAIS … (NO EXEMPLO)"; "Transformação comprovada · Cumprido · Pelo menos um experimento concluído teve efeito medido pelo critério do Culture Lab (diferença-em-diferenças) · 3 experimento(s) com efeito medido" | pelo título da seção |
| Prova de ciclo | "Resultado simulado: Comprovado … dados demonstrativos … não comprova execução nem efeitos em organização real" | presente |
| Exportação | botão "Imprimir prévia". Os avisos "PRÉVIA DEMONSTRATIVA", "Ambiente demonstrativo", "(NO EXEMPLO)" e "não é certificação" não estão em contêiner `print:hidden` → permanecem na impressão | preservado (conferência por DOM; diálogo de impressão não aberto) |

Sem alteração em /selo.

## /relatorios (sessão válida, RH)

| Onde | Observado | Contexto demonstrativo |
| --- | --- | --- |
| Cabeçalho | "Evidências e relatórios · demonstração"; "Origem dos dados … pertencem à demonstração"; "A ação de PDF é simulada" | presente |
| Selo | "Selo Empresa Viva™ · exemplo · Modelo demonstrativo de certificação" | presente |
| Requisito do Culture Lab | **antes:** "≥ 1 experimento concluído no Culture Lab · Ritual de Reconhecimento ✓" — mais fraco que a regra do Selo (efeito confirmado) e sem marca de origem junto ao ✓ | **corrigido** |
| Evidências | "Os estados abaixo não representam aprovação de evidências da sua organização" | presente |
| Exportação | "Simular geração de PDF" → "Simulação concluída. Nenhum arquivo PDF foi gerado por esta ação." | presente |

**Ajuste:** requisito agora "≥ 1 experimento com efeito confirmado pelo critério do Culture Lab · Ritual de Reconhecimento ✓ (dado demonstrativo)" (`src/mocks/relatorios-mock.ts`). Conferido no navegador após recarregar.

**Regra do Selo:** preservada (`certification-engine.ts` intacto). Nenhum ajuste exigiu mudar a regra; o texto do requisito em /relatorios passou a refletir a regra existente.
