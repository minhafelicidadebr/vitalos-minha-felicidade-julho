# DECISÃO — Onda T5 · Trilho de Licenciamento da Versão Validada do COPSOQ

> Data: 2026-07-20 · Status: **AGUARDANDO DECISÃO COMERCIAL DO FOUNDER**
> Origem: auditoria "COPSOQ II Product Truth & Commercial Readiness Gate"
> (Ondas T1–T4 de código fechadas — PRs #6, #7, #8, #10).
> Natureza: decisão de negócio/licenciamento. **Nenhum código muda antes da decisão.**

---

## 1. Contexto — o que as Ondas T1–T4 estabeleceram

O produto hoje serve uma **bateria autoral demonstrativa** estruturada nas
dimensões do COPSOQ II (`validation_status: "demonstrativo"`), com a verdade
disso travada por construção:

- **Manifesto canônico** (`src/domain/survey/copsoq-instrument-manifest.json`,
  frozen): identidade, licença, claims permitidos/proibidos, hashes dos 41
  itens realmente servidos. Divergência quebra o gate.
- **Truth Layer pública**: landing e `/sst` derivam rótulos do manifesto;
  teste varre todo o copy contra `forbidden_claims`.
- **Dossiê PGR**: a matriz probabilidade×severidade é rotulada como
  "transformação VitalOS — critério de gestão NR-01", nunca como parte
  oficial do instrumento.

Ou seja: o produto é **honesto e defensável no estado atual**. A Onda T5
existe para responder UMA pergunta comercial:

> **Vale a pena licenciar uma versão validada (NCOPSII / COPSOQ II-Br) para
> promover o instrumento de "demonstrativo" a "validado"?**

## 2. O que a promoção a VALIDADO exige (já registrado no manifesto)

Requisitos cumulativos do `licence.note` — nenhum é opcional:

| # | Requisito | Tipo |
| - | --------- | ---- |
| 1 | Licença **escrita** cobrindo uso comercial SaaS | Jurídico/comercial |
| 2 | Itens **verbatim** da fonte licenciada (`item_hashes` 1:1) | Conteúdo |
| 3 | Escala e scoring **da norma** (não os atuais 1–5 autorais) | Psicométrico |
| 4 | Atribuição renderizada no produto | Produto |
| 5 | Revisão científica registrada (regra 8 do CLAUDE.md: claim muda ⇒ revisão reabre) | Governança |
| 6 | **Profissional legalmente habilitado nomeado** | Pessoas/jurídico |
| 7 | Flip de `validation_status` por **descongelamento formal com bump de versão** | Engenharia |

## 3. Opções na mesa

### Opção A — Permanecer demonstrativo (custo zero, estado atual)
- **Prós:** já defensável (T1–T4); zero custo/prazo; a proposta de valor
  educativa e de organização de evidências continua válida; o PGR continua
  sendo responsabilidade do profissional habilitado do cliente (como sempre foi).
- **Contras:** o comercial nunca pode dizer "COPSOQ II validado"; clientes
  enterprise com SESMT maduro podem exigir instrumento validado e escolher
  concorrente; teto de credibilidade científica no Domínio B.
- **Quando faz sentido:** enquanto o funil de vendas não perder negócio por
  ausência de versão validada.

### Opção B — Licenciar versão validada brasileira (NCOPSII / COPSOQ II-Br)
- **Prós:** destrava o claim mais forte permitido por evidência real; melhora
  a defensabilidade perante auditor/fiscal do trabalho; diferencial comercial
  no vertical NR-1.
- **Contras:** custo e prazo desconhecidos (ver §4); obriga refação da
  bateria servida (itens verbatim + escala da norma ⇒ quebra de série
  histórica dos dados demonstrativos — decisão de migração a registrar);
  exige profissional habilitado nomeado no fluxo.
- **Quando faz sentido:** ao primeiro sinal objetivo de negócio perdido ou
  travado pela ausência da versão validada.

### Opção C — Validação científica própria (longo prazo)
- Estudo psicométrico próprio da bateria autoral (com parceiro acadêmico).
- **Prós:** ativo proprietário permanente, sem royalty de terceiro.
- **Contras:** o mais caro e lento dos três; exige o Trilho B (pesquisa
  científica) que está **pausado por decisão vigente**; não é alternativa de
  curto prazo. Registrada apenas para o mapa ficar completo.

## 4. O que NÃO está registrado no repo (obter externamente antes de decidir B)

Estas lacunas são fatos que **não existem em nenhum documento deste
repositório** e não podem ser presumidos — precisam de levantamento externo
pelo founder (contato direto + assessoria jurídica):

1. **Quem detém e concede** a licença da adaptação brasileira (NCOPSII) e da
   rede COPSOQ internacional para uso **comercial SaaS** — e se esse tipo de
   uso é sequer licenciável hoje.
2. **Custo e modelo** (taxa única, royalty por aplicação, por empresa cliente?).
3. **Prazo e condições** (auditoria do detentor sobre o produto? restrições
   de agregação/exibição?).
4. **Escopo de idioma/território** (pt-BR cobre o quê; e o COPSOQ III?).
5. **Se a licença exige** aplicação supervisionada por profissional específico
   (além do que a NR-1 já exige para o PGR).

> ⚠️ Regra científica permanente do projeto: **não pesquisar/revalidar fontes
> por conta própria** (Trilho B pausado, *trust once reuse many*). Este
> levantamento é diligência COMERCIAL do founder, não tarefa de implementação.

## 5. Gatilho de execução técnica (só depois da decisão)

Se e somente se a Opção B for contratada (licença escrita em mãos):

1. Descongelamento formal do manifesto (`frozen: true` ⇒ processo de bump).
2. Substituição da bateria pelos itens verbatim licenciados; `item_hashes`
   regenerados 1:1 contra a fonte.
3. Escala/scoring da norma; `norm_reference` preenchido.
4. Atribuição renderizada nas telas Domínio B.
5. Revisão científica registrada; profissional habilitado nomeado.
6. Flip `validation_status: "demonstrativo"` → `"validado"` com bump de
   versão do manifesto — e só então o comercial ganha os claims novos
   (`allowed_claims` atualizados na mesma revisão).

Enquanto isso não acontece, **nada muda**: os `forbidden_claims` atuais
("COPSOQ II validado", "conformidade NR-1 garantida", etc.) continuam
travados pelo gate.

## 6. Decisão requerida

- [ ] **Opção A** — permanecer demonstrativo (nenhuma ação; revisitar quando
      o funil sinalizar perda objetiva).
- [ ] **Opção B** — iniciar diligência de licenciamento (founder executa o §4;
      código só se move com licença escrita).
- [ ] **Opção C** — registrar interesse de longo prazo (não iniciável com o
      Trilho B pausado).

Registrar a decisão neste arquivo (data + opção + racional) quando tomada.
