# Decisão — índice server-side sobre agregados públicos

Data: 19/06/2026  
Status: implementado em modo demonstrativo server-only

## Problema

O índice não pode receber respostas individuais nem depender de uma flag visual de privacidade.
Também não pode recalcular médias no navegador. A entrada precisa ser o contrato público produzido
depois da trava k-anônima.

## Tree of Thoughts

1. Calcular diretamente das respostas privadas: matematicamente simples, mas amplia a superfície
   sensível e acopla captura, agregação e índice.
2. Enviar agregados privados ao cliente: rejeitado; transforma a interface em fronteira de dados.
3. Aceitar qualquer agregado marcado como visível: rejeitado; uma flag inconsistente poderia carregar
   uma média protegida.
4. Recalcular o índice no cliente: rejeitado; perde a garantia de lineage server-side.
5. Adaptador puro `PublicAggregation → IVOInput`, seguido do motor de índice no servidor: escolhido.

## Contrato escolhido

- a agregação geral precisa ser publicável e respeitar `k >= 5`;
- pilar visível precisa ter média finita, dentro da escala e `n >= k`;
- pilar protegido precisa carregar `mean: null` e fica ausente da entrada do índice;
- contratos duplicados ou inconsistentes falham fechados;
- o resultado público remove médias por pilar e itens de exemplo;
- a prova declara `source: published_aggregates_only`;
- packs desconhecidos não caem silenciosamente no pack Empresa.

## Limite honesto

O pipeline usa fixtures determinísticas confinadas ao servidor. Ainda não há respostas persistidas,
sessão assinada, RLS ou execução transacional no Lovable Cloud. O resultado demonstra o contrato e a
fronteira técnica, não um índice de pessoas reais.
