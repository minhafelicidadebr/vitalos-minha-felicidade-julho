# Decisão — Captura cega de respostas com recibo sem conteúdo

Data: 19 de junho de 2026

## Tese

Uma resposta individual precisa atravessar o navegador para ser enviada, mas não deve permanecer
no cliente, voltar no payload de resposta, alimentar telemetria ou ser confundida com um agregado.
A fronteira de captura deve aceitar apenas instrumentos válidos, devolver somente um recibo
operacional e falhar fechado quando a persistência segura não existir.

## Lentes convocadas

- Privacidade e LGPD: minimização, finalidade e ausência de eco do conteúdo.
- Segurança de aplicação: validação server-side, limites de payload e falha fechada.
- Psicometria: conjunto de itens e escala vêm da definição do instrumento, sem aceitar itens
  inventados ou valores fora da escala.
- Experiência: falha de rede preserva o formulário em memória para nova tentativa; sucesso apaga a
  memória e explica honestamente o que ocorreu.

## Árvore de alternativas

1. Manter a conclusão inteiramente local.
   - Rápido, porém não prova a fronteira que receberá dados reais.
2. Persistir respostas no `localStorage`.
   - Facilita retomada, mas viola minimização e amplia exposição do conteúdo.
3. Enviar e devolver as respostas no resultado da API.
   - Conveniente para debug, porém cria eco desnecessário e risco de logs/cache.
4. Bloquear todo envio até o Lovable Cloud.
   - Seguro, mas impede validar protocolo, UX de erro e contrato server-side.
5. Validar no servidor e descartar silenciosamente.
   - Minimiza dados, porém pode induzir o usuário a acreditar que houve persistência.
6. Validar no servidor, descartar explicitamente no demo e devolver recibo sem conteúdo.
   - Prova a fronteira, mantém honestidade e permite trocar somente o adaptador de persistência.

## Decisão

Adotar a alternativa 6.

## Protocolo

O cliente envia:

- `submissionId` gerado no momento do envio e reutilizado em tentativas;
- `packId` demonstrativo;
- `waveId`;
- `surveyId`;
- pares `itemId` + `value`.

O servidor:

1. valida tamanho e formato do payload com Zod;
2. resolve a onda ativa e a definição oficial do instrumento;
3. exige conjunto exato de itens, sem ausência, extras ou duplicidade;
4. valida cada valor contra a escala injetada;
5. no demo, descarta o conteúdo após validar;
6. emite recibo apenas com metadados operacionais;
7. se o modo Cloud for solicitado sem adaptador, bloqueia sem fallback local.

## Recibo público

O recibo contém:

- IDs da submissão, onda e instrumento;
- nome curto do instrumento;
- quantidade de itens;
- instante de aceitação;
- modo de persistência;
- indicadores `persisted` e `contentReturned`.

O recibo nunca contém:

- respostas;
- `itemId`;
- valores;
- scores;
- pilares respondidos;
- identidade do participante.

## Estado no navegador

- Durante o preenchimento, valores existem somente na memória transitória do componente.
- Em falha de rede, permanecem na tela para permitir nova tentativa.
- Após aceitação, o objeto de respostas é apagado.
- O `localStorage` conserva somente o ID da onda respondida e a evidência ética de participação.

## Limite honesto

`ephemeral_demo` significa validação server-side sem persistência. Nenhum agregado real é alterado.
`cloud_persisted` só poderá ser emitido por um adaptador Lovable Cloud que grave sob tenant, sessão
e RLS. A implementação atual nunca promove o demo para persistência real por configuração.

## Próxima fatia

Após ativar o Lovable Cloud:

1. derivar tenant, sujeito e pack da sessão, nunca do payload;
2. persistir com chave única de idempotência;
3. separar tabela de respostas da tabela de participação;
4. impedir qualquer endpoint de leitura individual para papéis cliente;
5. produzir agregados server-side somente com `n >= 5`;
6. emitir `cloud_persisted` apenas após commit confirmado.
