# Consolidação sobre o `main` · 20/11/2026

Branch local `integ/main-consolidacao` (worktree `..\vitalos-consolidacao`), criada a partir de `origin/main` @ `7338ebf`. Merge `775ce57` de `feat/claude-ciclo-relatorio` (`a31b910`). São 127 commits à frente do `main`. **Nada foi enviado.**

## O que entra

- **Integração Q1+Q2** (`f8cabb9`):
  - preparação, comunicado, delegação e revisão técnica do Q1;
  - ciclo completo do Q2 por papel.
- **Q1 COPSOQ:**
  - forma II-Br curta adotada;
  - referência estrutural;
  - direção de pontuação por soma;
  - casos sintéticos;
  - decisão comercial.
- **Relatório Global:** modelo do ciclo rastreável e PDF sintético.
- **Comercial:** oferta de serviços do Q1 em `/programa` e correções de linguagem sobre "efeito medido".
- **Guia da Jornada Empresarial** (V2.1):
  - `/guia-empresarial`, entrada da home com senha editorial;
  - `/ivo-integral/guia`, "Guia da minha jornada" no painel.

## Conflitos e como foram resolvidos

| Arquivo | Decisão |
|---|---|
| `src/lib/presentation/access.server.ts` | Mantida a versão do `main`, com **sessão sem estado assinada no cookie**, que funciona entre instâncias do Worker. Foram acrescentados nome de cookie, caminho e escopo de assinatura opcionais. O guia usa cookie `vitalos_guide`, caminho `/api/guia` e escopo `guide-session`. |
| `src/lib/presentation/access.server.test.ts` | Mantida a versão do `main`. |
| `src/lib/presentation/content.server.ts` | Card do Q1 com a redação comercial aprovada ("Serviço, não questionário"). |
| `src/app/auth/AuthGate.tsx` | Prefixos públicos `/apresentacao` (do `main`) e `/guia-empresarial`. |
| `src/routes/__root.tsx` | Concierge e splash do `main`, mais o desvio do shell da apresentação. |
| `src/routeTree.gen.ts` | Regenerado pelo build. |

**Efeito no guia:** a pendência "armazenamento da sessão editorial no ambiente de destino" fica resolvida pelo mecanismo do `main`. Configuração: `VITALOS_GUIDE_ORIGIN` (origens separadas por vírgula) e `VITALOS_GUIDE_VERIFIER` (scrypt-v1). Não é mais preciso declarar processo único.

## Verificação

**Build e gate:**
- `bun run build`: verde.
- Gate: 4.605 aprovados e 4 falhas. As 4 já falhavam no `origin/main` @ `7338ebf`, medidas no mesmo gate antes da junção:
  - `package.json` dev/build e preflight;
  - nomes no `.env` versionado;
  - tipos da Wave 2.1.

  Elas vêm de mudanças do `main` e ficam fora desta consolidação. Os 2 testes de link de setor que falhavam no `main` agora passam.
- Paridade de schema, TypeScript e varredura de segredos: limpos.

**Navegador** (candidato em `localhost:8099`, sem backend, segredo de teste):
- `/guia-empresarial`, `/apresentacao/empresas`, `/q3-demo` e `/programa` respondem 200.
- `/api/guia` responde 401 sem senha.
- A senha de teste libera a abertura do guia.
- **A sessão do guia continua válida depois de reiniciar o servidor.** Essa é a prova da sessão sem estado.

**Reaproveitado:** as provas por papel da fatia Q2 (`docs/vitalos/guia/PROVA_GUIA_FATIA_Q2_2026-11-20.md`) e da integração Q1+Q2. O comportamento dessas partes não mudou no merge; a única mudança foi o mecanismo de sessão, provado acima.

## O que o envio exige (autorizações separadas)

1. **Push de `integ/main-consolidacao` para o `main`.**
   - É avanço direto: o `main` é ancestral da branch.
   - O Lovable sincroniza, e a prévia passa a ter o código.
2. **14 migrations novas** no banco do Lovable Cloud:
   - lista: `20261002120000` … `20261119130000` (`git diff --name-only --diff-filter=A origin/main HEAD -- supabase/migrations`);
   - sem elas, as telas institucionais do Q1 e do Q2 e "Meu percurso" ficam sem tabelas e RPCs;
   - o código recusa e não exibe dado no lugar;
   - **aplicar em produção exige autorização explícita** (guardrail de produção vigente).
3. **Segredos do guia** no servidor: `VITALOS_GUIDE_ORIGIN` e `VITALOS_GUIDE_VERIFIER`, com a senha definida por João Paulo. Sem eles, `/guia-empresarial` responde "indisponível".
4. **Publicar no Lovable** para chegar a vitalos.com.br.

## Ainda pendente de decisão

- Papéis `DIRETOR`, `DGP_RH` e `SESMT_SAUDE` no Q2.
- Rótulo "Disponível" em `/programa`.
- Acesso dos colaboradores ao relatório anual.
- Validação com pessoas.
- No Q1: enunciados oficiais da II-Br, regra para respostas em branco e permissão de uso.
