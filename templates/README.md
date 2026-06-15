# templates/ — modelos portáteis (reutilizáveis entre projetos)

Esta pasta guarda **modelos reutilizáveis**, não código nem doutrina deste app.

| Arquivo                           | O que é                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL_UNIVERSAL_MENTE_FABLE5.md` | Modelo padrão da inteligência **Fable 5** para instanciar em qualquer projeto novo. Núcleo imutável + protocolo de instanciação (entrevista + slots `{{...}}`) + exemplo. |

**Como usar em um projeto novo:**

1. Copie `SKILL_UNIVERSAL_MENTE_FABLE5.md` para o novo repositório em `docs/SKILL_MESTRA_<PROJETO>.md`.
2. Rode o Protocolo de Instanciação (Parte II): responda à entrevista, preencha os slots.
3. Aponte o `CLAUDE.md` do projeto para a doutrina resultante como **primeira leitura obrigatória**.

> Neste projeto (4 Lentes VITA), a doutrina ativa é `docs/SKILL_MESTRA_FABLE5.md` — esta pasta
> apenas hospeda o modelo genérico para reuso futuro.
