# PACOTE FIB-T ISG — COMO USAR NO CLAUDE CODE

Este pacote deve ser colocado dentro do repositório do VitalOS.

## Estrutura

docs/
└── fibt-isg/
    ├── README_COMO_USAR.md
    ├── FIBT_SUPER_PROMPT_ISG.md
    ├── FIBT_DIAGNOSTICO_BASELINE.md
    ├── FIBT_DECISION_LEDGER.md
    ├── COMANDO_PARA_CLAUDE_CODE.md
    └── references/
        └── FIB-T_Furtado_2020.pdf

## Passo a passo

1. Extraia o arquivo ZIP.
2. Copie a pasta `fibt-isg` inteira.
3. Dentro do repositório do VitalOS, abra a pasta `docs`.
4. Cole a pasta `fibt-isg` dentro de `docs`.
5. O caminho final deve ser:

   `docs/fibt-isg/`

6. Abra o Claude Code no repositório correto.
7. Primeiro peça para ele confirmar repositório, branch, HEAD e working tree.
8. Depois copie para o chat do Claude Code o conteúdo do arquivo:

   `COMANDO_PARA_CLAUDE_CODE.md`

Não é necessário colar separadamente o Decision Ledger, o diagnóstico ou o Super Prompt no chat. O comando manda o Claude Code ler todos esses arquivos.

## Importante

Nesta etapa:

- não autorize produção;
- não autorize deploy;
- não autorize push ou merge;
- não importe pessoas reais;
- não envie convites reais;
- não colete respostas reais;
- use apenas staging e dados sintéticos.
