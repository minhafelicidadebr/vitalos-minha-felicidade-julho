# CHECKLIST DE DILIGÊNCIA — Licenciamento de Versão Validada do Instrumento Psicossocial

> Data de abertura: 2026-07-22 · Status: **ABERTO — execução externa do founder**
> Origem: `docs/DECISAO_T5_TRILHO_LICENCIAMENTO_COPSOQ_2026-07-20.md` §6–§7
> (Opção B decidida em 2026-07-22).

---

## O que este documento é — e o que ele não é

Este é um **checklist de campo**, para uso direto com contatos institucionais
e assessoria jurídica. Nenhum item aqui foi pesquisado, preenchido ou
presumido por implementação — a regra científica permanente do projeto
proíbe isso (Trilho B pausado, *trust once reuse many*; ver CLAUDE.md).

Levantar estes fatos é diligência **comercial e jurídica do founder**, não
tarefa de código. Nada muda no produto (manifesto, landing, instrumento,
runtime, banco) até que:

1. este checklist esteja documentado e completo;
2. uma avaliação jurídica formal tenha revisado as condições levantadas;
3. o founder tome uma nova decisão formal, registrada em
   `DECISAO_T5_TRILHO_LICENCIAMENTO_COPSOQ_2026-07-20.md`.

O instrumento atualmente servido pelo VitalOS é referido aqui pelo nome de
trabalho **"Protocolo VitalOS de Mapeamento Psicossocial"** — um rótulo de
registro para esta diligência, não um nome aplicado a qualquer superfície do
produto.

---

## Checklist

### 1. Versão validada aplicável
- [ ] Qual é a versão brasileira validada aplicável (NCOPSII, COPSOQ II-Br,
      outra adaptação nacional)?
- [ ] Existe mais de uma versão validada concorrente/alternativa no Brasil?

### 2. Fonte científica primária
- [ ] Qual é a publicação/fonte primária que valida essa versão (autores,
      ano, periódico, instituição responsável pela validação)?

### 3. Responsáveis e contatos institucionais
- [ ] Quem detém e concede a licença da adaptação brasileira?
- [ ] Quem representa a rede COPSOQ internacional para fins de licenciamento?
- [ ] Contatos diretos (nome, instituição, e-mail/telefone) de ambos.

### 4. Licença para uso comercial e SaaS
- [ ] Existe licença aplicável a uso **comercial** (não só acadêmico/pesquisa)?
- [ ] Esse tipo de uso — SaaS multi-tenant, aplicação repetida a múltiplos
      clientes — é sequer licenciável hoje, nos termos de quem detém os direitos?

### 5. Necessidade de autorização específica
- [ ] A licença exige aplicação supervisionada por profissional específico,
      além do que a NR-1 já exige para o PGR?
- [ ] Há exigência de credenciamento, treinamento ou certificação da equipe
      que administra o instrumento?

### 6. Itens, dimensões, escala e scoring canônicos
- [ ] Itens verbatim da versão licenciada (para gerar `item_hashes` 1:1).
- [ ] Número de dimensões e sua estrutura oficial.
- [ ] Escala e método de scoring da norma (não os atuais 1–5 autorais do
      VitalOS).
- [ ] Existem tabelas normativas de referência (percentis, pontos de corte)
      publicadas junto à versão licenciada?

### 7. Limites de adaptação
- [ ] Que grau de adaptação de redação/interface é permitido sem violar a
      licença (ex.: rótulos de UI, tradução de labels, agrupamento visual)?
- [ ] Corte/agregação de itens é permitido, ou a aplicação precisa ser
      integral?

### 8. Atribuições obrigatórias
- [ ] Que texto de atribuição/crédito a licença exige, e onde ele precisa
      aparecer no produto (tela, relatório, PDF, landing)?

### 9. Condições de cobrança pelos serviços do detentor
- [ ] Modelo de cobrança: taxa única, royalty por aplicação, por empresa
      cliente, por respondente?
- [ ] Valores de referência (mesmo que estimados nesta fase).
- [ ] Reajuste, renovação, prazo mínimo de contrato.

### 10. Requisitos para integração ao VitalOS
- [ ] Auditoria do detentor sobre o produto antes de autorizar o uso?
- [ ] Restrições sobre agregação, exibição ou exportação de resultados?
- [ ] Escopo de idioma/território coberto (pt-BR cobre o quê; e versões
      internacionais mais recentes, ex. COPSOQ III?).

### 11. Riscos jurídicos, científicos e operacionais
- [ ] Risco jurídico de operar sem licença clara hoje (o VitalOS já está
      protegido pelo status demonstrativo declarado — mas mapear o risco de
      qualquer zona cinzenta).
- [ ] Risco científico: paridade metodológica entre o que é servido hoje e a
      versão licenciada (ver §12 do plano original — confirmação de paridade
      antes do flip de status).
- [ ] Risco operacional: o que quebra na base de dados/série histórica ao
      trocar de bateria autoral para itens verbatim licenciados.

---

## Depois de preenchido

1. Anexar/referenciar aqui os documentos e comunicações que sustentam cada
   resposta (contrato proposto, e-mail do detentor, parecer jurídico).
2. Levar para avaliação jurídica formal.
3. Registrar a decisão final em
   `docs/DECISAO_T5_TRILHO_LICENCIAMENTO_COPSOQ_2026-07-20.md` (nova entrada,
   com data), antes de qualquer mudança técnica.
