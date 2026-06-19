# Decisão — atestação privacy-safe do pipeline

Data: 19/06/2026  
Status: implementado como prova de contrato demonstrativo

## Problema

Captura, agregação e índice estavam testados separadamente, mas faltava um artefato único que
permitisse verificar a coerência do lineage. Esse artefato não pode registrar respostas, hashes de
respostas ou derivados privados: hashes de conteúdo sensível continuam sendo dados sensíveis.

## Tree of Thoughts

1. Hash das respostas individuais: rejeitado; cria identificador persistente de conteúdo privado.
2. Log detalhado de payloads: rejeitado; aumenta retenção e superfície de incidente.
3. Apenas selar o score final: insuficiente; não prova as barreiras intermediárias.
4. Checklist visual sem digest: insuficiente; não é reproduzível.
5. Manifesto canônico de metadados públicos + checks puros + SHA-256 server-side: escolhido.

## Contrato escolhido

- o engine puro avalia onze checks em Capturar, Agregar e Calcular índice;
- o manifesto contém somente modo, contagens, score público, lineage e resultados dos checks;
- o payload canônico exclui timestamp para que o digest seja reproduzível;
- o SHA-256 é calculado no servidor;
- o escopo do digest é declarado como `sanitized_public_metadata`;
- o nível atual é `demo_contract`, nunca `production_runtime`;
- o snapshot do pipeline é atômico: agregação, índice e atestação compartilham o mesmo instante.

## Limite honesto

O digest prova a integridade do manifesto público produzido pela demonstração, não a existência de
respostas persistidas nem a execução de RLS. O nível `production_runtime` só poderá ser emitido após
captura persistida e confirmada em infraestrutura Cloud.
