# Plano do Instituto Felicidade para Todos · Growth

**Data:** 21/11/2026 · **Origem:** resposta do proponente nesta conversa: "Instituto em Growth".

**Contexto:** a MO2 provou que o plano Piloto só permite COPSOQ e recusa a onda FIB-T, que o Q2 exige (D7, `docs/vitalos/piloto/MO2_JORNADA_Q2_2026-11-21.md`).

**Decisão:** o Instituto opera o piloto no plano **Growth** (`plan-engine.ts`: até 5 administradores, 4 ondas por mês, 500 convites por onda, instrumentos COPSOQ, PERMA, VIA-T e FIB-T, retenção de 12 meses). O catálogo de planos **não** muda: o Piloto continua só com COPSOQ.

**Efeitos:**
- D7 resolvido para o Instituto.
- **[Histórico, anterior ao #57 (mesclado em 22/11/2026, `425b4a9`)]** D1 era necessário: com o código da `main` de 21/11, o Growth contava todo perfil como assento (limite 5), e uma coorte de 8 a 15 pessoas ficaria bloqueada no 5º convite. **Estado atual:** a correção de assentos foi mesclada (#57) e a função `reserve_member_invite` está presente no banco do projeto desde 22/11 com permissões conferidas (`anon`/`authenticated` sem EXECUTE, `service_role` com). Ela está **ausente do histórico de migrations** (aplicada por consulta direta) e o **convite de ponta a ponta no app publicado ainda não foi testado**, então o limite de 5 administradores do Growth continua sem prova no ambiente publicado.
- O plano é atribuído pela plataforma ao ativar a organização; nenhuma alteração foi feita em ambiente real.

**Não decide:** preço, contrato, duração comercial ou condições de cobrança.
