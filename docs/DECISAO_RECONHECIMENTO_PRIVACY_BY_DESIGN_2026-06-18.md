# Decisão — Reconhecimento social com privacidade por desenho

Data: 18 de junho de 2026

## Tese

Reconhecimento entre pares é uma relação social, não uma métrica de desempenho. O VitalOS™ deve permitir gratidão específica e visível quando consentida, sem transformar a mensagem em telemetria, ranking ou insumo de remuneração.

## Árvore de alternativas

1. Reutilizar somente o ledger de participação.
   - Simples, porém incapaz de representar destinatário, visibilidade, consentimento e cooldown social com rigor.
2. Persistir a mensagem completa junto ao evento.
   - Facilita mural e histórico, mas cria conteúdo sensível desnecessário e amplia superfície de acesso.
3. Não persistir nada e manter apenas estado de interface.
   - Maximiza minimização, porém não sustenta orçamento, antiabuso ou rastreabilidade demonstrativa.
4. Criar um ledger social separado e duplicar XP nele.
   - Modela bem a relação, mas cria duas fontes de verdade para a economia.
5. Criar um ledger social mínimo e compô-lo com o ledger de participação.
   - Preserva separação de responsabilidades: o ledger social decide se o reconhecimento é válido; só então emite evidência de participação para a economia.

## Decisão

Adotar a alternativa 5.

- O ledger social persiste somente `senderId`, `recipientId`, `pillarId`, `visibility` e `occurredOn`.
- Mensagem, rascunho, sentimento e contexto de desempenho não pertencem ao contrato persistido.
- O modo padrão é privado.
- Publicação exige consentimento explícito.
- Autor não pode reconhecer a si próprio.
- Há orçamento semanal por autor e cooldown por autor + destinatário + categoria.
- XP é concedido por participação validada, nunca por conteúdo, popularidade, desempenho ou quantidade recebida.
- Métricas coletivas só são exibidas quando a coorte satisfaz `k >= 5`.
- A política é injetada pelo Domain Pack; o engine permanece puro e não importa domínio.

## Invariantes verificáveis

1. O tipo `RecognitionEvent` não possui campo de mensagem.
2. Uma tentativa rejeitada não produz evento social nem XP.
3. O mesmo reconhecimento não pode ser repetido dentro do cooldown.
4. O orçamento reinicia em semana baseada em segunda-feira, independentemente do fuso local.
5. Agregados abaixo de `kAnonymityMin` permanecem ocultos.
6. O dashboard do colaborador não possui caminho alternativo de envio.

## Limites honestos do mock

- A mensagem é apenas estado transitório da interface e não simula entrega persistida ao destinatário.
- Consentimento e ledger vivem em `localStorage` no demo; não têm ainda peso jurídico ou isolamento de tenant.
- Autorização, RLS, auditoria imutável e retenção devem ser implementadas no servidor na fatia vertical de identidade e RBAC.

## Critério para evolução ao backend

A migração deve preservar o mesmo contrato mínimo e executar a validação no servidor. O cliente não deve receber acesso a mensagens privadas nem a eventos individuais de terceiros; agregados coletivos continuam sujeitos a k-anonimato.
