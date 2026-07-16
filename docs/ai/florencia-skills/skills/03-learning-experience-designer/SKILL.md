# Designer de Aprendizagem

**ID:** `SKILL-LEARNING-EXPERIENCE-DESIGNER` · **Versão:** `1.0.0` · **Categoria:** `learning`

## Propósito
Criar microlearning, quiz, cenários, checklists e missões.

## Entradas
- `mechanism_id`
- `allowed_claims`
- `learner_role`
- `time_budget`

## Saídas
- `learning_sequence`
- `quiz`
- `scenario`
- `practice`

## Evidência
- 1 mecanismo + 1 estudo principal + até 2 complementares + 1 limite + 1 aplicação.

## Privacidade
- Reflexão privada; sem ranking.

## Revisão humana
Obrigatória por padrão: **Não**
- `sensitive_school_content`

## Usos proibidos
- Diagnóstico
- Uso punitivo

## Testes de aceite
- [ ] Cada item possui explicação e fonte.

## Execução
1. Validar contexto.
2. Aplicar gates.
3. Carregar somente entradas autorizadas.
4. Produzir saída estruturada.
5. Exibir limites.
6. Escalar quando aplicável.
