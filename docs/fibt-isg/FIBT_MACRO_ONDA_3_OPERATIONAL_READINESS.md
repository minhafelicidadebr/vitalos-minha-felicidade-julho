# FIB-T Macro-Onda 3 - ISG Pilot Operational Readiness

Data de corte: 2026-08-12
Branch local: `feat/fibt-isg-pilot-operational-readiness`
Base validada: `d86cac0795955f0ae4361b33941b1b5c3b872654`

## Estado objetivo

Preparar o fluxo FIB-T para uma operacao setorial controlada sem usar dados
reais, enviar convites, acessar producao ou ampliar o deployment publico HML.

## Decisao de arquitetura

O painel `/admin` continua sendo o control plane autenticado. O deployment
isolado FIB-T HML continua permitindo apenas coleta e atestacao sinteticas. As
novas server functions administrativas nao entram na allowlist HML.

O modelo operacional e `LINK_MODEL=SECTOR`:

1. criar uma campanha FIB-T com meta de participantes e zero convites individuais;
2. cadastrar cada setor como `wave_cohorts` com chave canonica;
3. emitir no maximo um link `active` por onda e chave de setor;
4. exibir o token bruto apenas na resposta de criacao;
5. acompanhar somente metadados e contagem protegida (`<5` abaixo do limiar);
6. revogar explicitamente antes de renovar;
7. abrir o dashboard FIB-T pelo identificador da onda, sem digitacao manual.

## Invariantes

- `orgId` e papel administrativo sao derivados da sessao no servidor.
- A onda precisa pertencer a organizacao autenticada.
- Criacao de setor e emissao de link exigem onda `collecting`.
- `sector_links.sector_label` guarda a chave canonica de `wave_cohorts.key`.
- Link sem coorte correspondente falha fechado e aparece como anomalia de metadata.
- Nenhuma leitura retorna `answers`, token bruto persistido, e-mail ou identidade.
- Contagens exatas de 0 a 4 nunca saem da camada server para a UI.
- A campanha setorial nao gera nem envia convites individuais.
- O dashboard segue dependente do feature gate FIB-T existente.

## Migration local

`20260812120000_one_active_sector_link_per_cohort.sql`:

- aborta se ja existirem dois links `active` para a mesma onda/chave;
- cria indice unico parcial para novas concorrencias;
- adiciona FK `(wave_id, org_id) -> waves(id, org_id)` como `NOT VALID`;
- adiciona FK `(wave_id, sector_label) -> wave_cohorts(wave_id, key)` como `NOT VALID`;
- nao altera, exclui ou corrige registros historicos automaticamente.

`NOT VALID` preserva custodia de anomalias legadas, mas protege toda nova
escrita. A validacao integral das constraints so deve ocorrer depois de uma
reconciliacao humana documentada.

## Estados de UX

O painel setorial implementa estados separados de carregamento, vazio, erro e
dados. Links ativos, expirados e revogados possuem rotulos distintos. Links sem
coorte aparecem em alerta operacional com revogacao em duas etapas.

## Fora de escopo nesta entrega

- nomes, quantitativos e qualquer dado real de setores do ISG;
- envio de link a colaborador;
- aplicacao da migration em producao;
- aplicacao remota da migration em HML sem gate especifico;
- alteracao de Cloudflare ou do boundary HML;
- habilitacao produtiva do feature flag FIB-T;
- merge, push ou promocao automatica.

## Gate antes do piloto humano

1. aprovar a lista real de setores e a meta de participantes fora do repositorio;
2. executar preflight read-only em STAGING para links `active` duplicados;
3. aplicar a migration somente em STAGING por autorizacao especifica;
4. validar as constraints e o estado da wave sintetica;
5. executar uma fixture HML sem dados reais;
6. fazer smoke do fluxo setorial com Network preparado;
7. realizar revisao humana de UX no control plane autenticado;
8. manter producao como `NOT_ASSERTED`.
