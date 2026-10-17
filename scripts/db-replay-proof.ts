#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════════════════════════
// REPLAY EXECUTÁVEL DA CADEIA DE MIGRATIONS + PROVA DE AUTORIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
//
// POR QUE ESTE SCRIPT EXISTE: até aqui, a garantia de que um REVOKE realmente
// fecha um caminho de escrita era leitura de SQL. O histórico deste
// repositório mostra o limite disso — 20260703130000 revogou UPDATE por
// coluna, ninguém percebeu que o GRANT de tabela pré-existente neutralizava a
// revogação, e o buraco sobreviveu à revisão humana até aparecer no banco
// vivo. Privilégio no Postgres é resultado da INTERAÇÃO de várias entradas de
// ACL, RLS e trigger; só o banco sabe o resultado. Então o banco é quem
// responde.
//
// O QUE FAZ: sobe um Postgres descartável em Docker, aplica o shim de
// plataforma, aplica a cadeia de migrations em ordem e executa as suítes de
// prova de supabase/tests/. Cada suíte é SQL que tenta o ataque de verdade,
// como `authenticated`, com JWT de sessão — e falha a execução se o ataque
// funcionar.
//
// NUNCA toca staging nem produção: o alvo é sempre um container local novo,
// endereçado por nome fixo, sem credencial de projeto nenhuma. Não existe
// caminho neste arquivo que aceite um host remoto.
//
// MODOS
//   --mode=clean    Banco limpo → cadeia COMPLETA → provas.
//                   Prova que um clone do repo reproduz o schema esperado.
//   --mode=preprod  Banco limpo → cadeia até o estado PRÉ-PRODUÇÃO observado
//                   → drift de ACL observado em produção → pacote G1 → provas.
//                   Prova que o pacote G1 funciona no estado REAL do alvo, não
//                   apenas no estado do desenvolvedor.
//
// USO
//   bun run db:replay              (clean)
//   bun run db:replay:preprod      (preprod)
//   bun run db:replay -- --keep    (mantém o container para inspeção)
//   bun run db:replay -- --inventory
//
// SAÍDA: relatório determinístico + exit code 0/1.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const raiz = process.cwd();

// ── Fronteira do pacote G1 ───────────────────────────────────────────────────
//
// Migrations com nome ESTRITAMENTE MENOR que este marco compõem o estado que a
// evidência read-only CONFIRMOU aplicado em produção: contrato de
// submit_sector_response com 2 argumentos (text, jsonb), sem colunas de
// consentimento. Da fronteira para frente está o pacote que o Gate G1 autoriza.
//
// A fronteira fica em 20260806210000, e não depois, porque o CONTRACT dessa
// timestamp comprovadamente nunca rodou (ver NAO_EXECUTAVEIS abaixo): remover
// wave_responses.invite_token é trabalho PENDENTE, não baseline.
//
// Esta constante é a fonte única da fronteira: o runbook G1, o modo preprod e
// o teste de custódia leem daqui.
const G1_BOUNDARY = "20260806210000";

/**
 * LINHAGEM: este repositório contém DUAS linhagens mutuamente exclusivas.
 *
 * `20260730160000_drop_response_invite_link_contract.sql` é a Migration B de
 * STAGING. As preconditions dela codificam o inventário do piloto sintético de
 * lá: exatamente 16 respostas com invite_token, dentro de duas organizações de
 * UUID fixo. Ela DROPA wave_responses.invite_token.
 *
 * `20260806210000_drop_response_invite_link_contract_production.sql` é a gêmea
 * de PRODUÇÃO. Ela EXIGE que invite_token ainda exista, e codifica o inventário
 * produtivo (3 ondas legadas seladas de UUID fixo, 30 convites, 0 respostas).
 *
 * As duas não podem rodar no mesmo banco, em nenhuma ordem: a primeira remove a
 * coluna que a segunda exige. Isso NÃO é defeito — é fail-closed funcionando,
 * cada migration recusando um banco para o qual a autorização humana não foi
 * dada. A consequência é que "replay lexicográfico da cadeia inteira" não é uma
 * afirmação possível, e um relatório que a declarasse verde estaria mentindo.
 *
 * O replay reproduz a LINHAGEM DE PRODUÇÃO, que é a relevante para o Gate G1.
 * A linhagem de staging fica declarada e fora do replay, não omitida.
 */
const STAGING_ONLY_MIGRATIONS = new Set([
    "20260730160000_drop_response_invite_link_contract.sql",
]);

/**
 * NÃO EXECUTÁVEL — achado desta onda, confirmado empiricamente.
 *
 * `20260806210000_drop_response_invite_link_contract_production.sql` aborta
 * SEMPRE, em qualquer banco PostgreSQL, na precondition 1.6. A consulta que
 * procura funções dependentes de wave_responses.invite_token faz
 *
 *     SELECT ... FROM pg_proc p JOIN pg_namespace n ...
 *      WHERE n.nspname = 'public' AND pg_get_functiondef(p.oid) ~* '...'
 *
 * e o planejador empurra o qual de `pg_get_functiondef` para o scan de pg_proc,
 * ANTES do join que filtraria o schema. `pg_get_functiondef` recusa agregados,
 * então a primeira agregada do pg_catalog encontrada aborta a transação com
 * `"array_agg" is an aggregate function`.
 *
 * Não é dependência de plano nem de dado: reproduzido em Postgres 17 VAZIO, sem
 * nenhum objeto do projeto. Ou seja, esta migration nunca rodou com sucesso em
 * lugar nenhum — o CONTRACT produtivo continua PENDENTE, e a presença de
 * wave_responses.invite_token em produção passa a ser questão de PREFLIGHT, não
 * um fato encerrado.
 *
 * O pacote G1 desta onda contém a substituta corrigida e idempotente. Aqui a
 * migration é excluída do replay de forma declarada — não silenciosa.
 */
/**
 * Migrations desta onda, escritas para serem reaplicáveis sem efeito colateral.
 * O critério é operacional, não estético: se a janela de mudança do G1 for
 * interrompida no meio, o operador precisa poder rodar o pacote de novo sem
 * primeiro descobrir, sob pressão, exatamente onde parou.
 */
/**
 * SUPERSEDIDA — achado da reconciliação com `main` (Wave 5.2.1), não editável
 * por esta onda.
 *
 * `20260825022411_81c55fc7-…` chegou de `main` (commit "Fixed security
 * issues", fora desta branch, gerado no chat do Lovable). Ela ataca o MESMO
 * achado CRITICAL por conta própria: cria `profile_own_select`/
 * `profile_own_update` e o trigger `prevent_profile_privilege_escalation`
 * (fail-open, só UPDATE — ver `20260828120000` para a análise completa de por
 * que não fecha o achado).
 *
 * `20260828120000` a SUPERSEDE: remove essas policies e esse trigger como
 * parte do próprio hardening (todos os DROP são `IF EXISTS`), e por isso é
 * indiferente ao estado de partida — funciona igual se `20260825022411` já
 * rodou ou não.
 *
 * É exatamente essa indiferença que justifica excluí-la do PACOTE G1-v2
 * EXECUTÁVEL, e não apenas das checagens de reaplicação: migration gerada no
 * reaplicação: migration gerada no chat do Lovable é aplicada no projeto
 * conectado, então o estado produtivo provável já a contém — e forçar sua
 * reexecução no runbook arriscaria abortar a janela de mudança por nada.
 * Confirmado empiricamente (Postgres 17 vazio, sem o hardening presente):
 * reaplicar `20260825022411` uma segunda vez ANTES do hardening aborta com
 * `policy "profile_own_select" for table "profiles" already exists` — ela não
 * tem guarda própria. Reexecutá-la DEPOIS do hardening seria pior: sucede em
 * silêncio e RECRIA a policy e o trigger fail-open ao lado da proteção de 3
 * camadas. Nenhum dos dois cenários é aceitável dentro de uma migration que o
 * runbook dispara sem intervenção humana por linha.
 *
 * Por isso ela vive na linhagem de BASELINE (replay: bucket "antes", não
 * "pacoteG1") e fora das duas checagens de reaplicação. O runbook G1 nunca a
 * inclui na lista de arquivos a aplicar em produção — o postflight (§8) prova
 * a supersessão pelo ESTADO FINAL ("exatamente 2 policies, 1 trigger,
 * prevent_profile_privilege_escalation() ausente"), que é verdadeiro
 * independente de `20260825022411` ter rodado lá ou não.
 */
const SUPERSEDIDAS_NAO_AUTORADAS = new Set([
    "20260825022411_81c55fc7-a2bd-4962-b11a-0e1945894d65.sql",
]);

/**
 * Fora do PACOTE G1 EXECUTÁVEL por decisão operacional, não por incapacidade
 * técnica — ver o comentário de `SUPERSEDIDAS_NAO_AUTORADAS` acima para o
 * raciocínio completo. Tratada como parte da linhagem de BASELINE
 * independente de timestamp: mesmo caindo, por nome, dentro da janela G1 (é
 * mais recente que `20260812120000`), ela não é entregável desta onda — é um
 * commit de terceiro que a onda precisou reconciliar.
 */
const ORIGINAL_M6_HISTORICA = "20260828121000_definer_surface_and_execute_grants.sql";
const M6A_ATUAL = "20260901120000_current_production_definer_surface_security_closure.sql";

/**
 * Pacote produtivo G1-v2: lista fechada, nunca inferida por timestamp/glob.
 * O M6 histórico permanece na linhagem RC/clean, mas é incompatível com o
 * baseline produtivo real porque exige 14 funções de módulos não promovidos.
 */
const PACOTE_G1_V2 = [
    "20260806211000_response_invite_link_contract_forward_fix.sql",
    "20260807120000_sector_response_consent_durability.sql",
    "20260811120000_fail_closed_sector_response_cohort_binding.sql",
    "20260812120000_one_active_sector_link_per_cohort.sql",
    "20260828120000_profile_authority_boundary_hardening.sql",
    M6A_ATUAL,
] as const;

/**
 * PACOTE TASK 10.1 — as três migrations de proteção de privacidade da coorte.
 *
 * ACHADO DA MACRO-ONDA 10.2 (defeito D3), corrigido aqui: o modo `preprod`
 * aplicava apenas `PACOTE_G1_V2` (lista fechada de 6 arquivos) e, ainda assim,
 * `rodarProvas()` executava TODAS as suítes de `supabase/tests/` por glob.
 * Resultado: 05 e 06 rodavam contra um banco sem `cohort_capsules` e sem a ACL
 * de `waves` fechada, e 03 falhava na supressão diferencial — três FAIL que não
 * eram defeito das migrations, e sim do harness.
 *
 * RECONCILIAÇÃO EXPLÍCITA DOS ARQUIVOS (59 no manifesto):
 *   59 total
 *   − 1  `20260730160000` … exclusiva de STAGING (gêmea mutuamente exclusiva)
 *   − 1  `20260806210000` … comprovadamente não executável (precondition 1.6)
 *   = 57 linhagem de produção replayável
 *
 *   Dentro dos 57, no modo `preprod`:
 *     47  baseline (`antes`): tudo com nome < 20260806210000, mais a
 *         `20260825022411` superseded (46 + 1)
 *      6  PACOTE_G1_V2
 *      3  PACOTE_TASK_10_1  ← faltava
 *      1  `20260828121000` M6 histórico, deliberadamente FORA do baseline
 *         produtivo e do pacote (exige 14 funções não promovidas); segue
 *         exercitado somente na linhagem `clean`.
 *     47 + 6 + 3 + 1 = 57 ✔
 *
 * A lista é FECHADA e nunca inferida por timestamp: adicioná-la por glob
 * reintroduziria a classe de erro que este arquivo existe para impedir.
 */
const TASK_10_1_WAVES_LOCKDOWN = "20260909220000_lock_down_waves_direct_writes.sql";
const TASK_10_1_DIFFERENTIAL = "20260909221000_cohort_differential_suppression.sql";
const TASK_10_1_BATCHED_RELEASE =
    "20260909222000_cohort_batched_release_temporal_privacy.sql";

const PACOTE_TASK_10_1 = [
    TASK_10_1_WAVES_LOCKDOWN,
    TASK_10_1_DIFFERENTIAL,
    TASK_10_1_BATCHED_RELEASE,
] as const;

/**
 * PACOTE IVO R6 — proveniência FIB-T em action_items e escopo de evidência.
 *
 * Preparado para REVISÃO; nunca aplicado remotamente. Lista fechada como as
 * demais: no `preprod` entra DEPOIS da Task 10.1 (é trabalho pendente sobre o
 * estado produtivo observado, onde o módulo Action Plan não está promovido e a
 * migration só adiciona colunas/constraints). Declara-se IDEMPOTENTE e o
 * replay verifica isso reaplicando-a.
 */
const PACOTE_IVO_R6 = ["20261002120000_fibt_action_provenance.sql"] as const;
/**
 * PACOTE IVO C8 — protocolo de eficácia, observações e pareceres.
 *
 * Preparado para REVISÃO; nunca aplicado remotamente. Depende apenas da TABELA
 * action_items (FK composta); as RPCs do ledger NÃO importam, e por isso ela
 * aplica também sobre o estado produtivo observado (tabelas presentes, RPCs
 * ausentes). Idempotente; sem função nova em public (gatilhos no schema ivo_c8)
 * para não ser abortada pela M6A.
 */
const PACOTE_IVO_C8 = ["20261005120000_ivo_efficacy_protocols.sql"] as const;
/**
 * PACOTE IVO PI-13 — inclusão de ação em plano existente e encerramento operacional.
 *
 * Preparado para REVISÃO; nunca aplicado remotamente. Migration ADITIVA nova
 * (nenhuma migration anterior é reescrita): colunas de auditoria, índice de
 * idempotência e gatilhos no schema ivo_ledger. Sem função nova em public, para
 * não ser abortada pela M6A; o replay reaplica a M6A depois dela e exige que a
 * reconciliação passe. Depende só das TABELAS do ledger e das colunas do R6.
 * Idempotente.
 */
const PACOTE_IVO_PI13 = ["20261016120000_ivo_plan_composition_and_closure.sql"] as const;
/** Clone do estado produtivo observado ANTES do PI-13 (ensaio de atualização com dados do ledger). */
const CLONE_PI13_ANTERIOR = "pi13_estado_anterior";

const IDEMPOTENTES = new Set([
    // G1-v2.
    "20260806211000_response_invite_link_contract_forward_fix.sql",
    "20260828120000_profile_authority_boundary_hardening.sql",
    M6A_ATUAL,
    // M6 histórico continua verificável apenas na linhagem clean/RC.
    ORIGINAL_M6_HISTORICA,
    // Pré-existentes, verificadas como reaplicáveis pelo próprio replay:
    // CREATE OR REPLACE da função, CREATE UNIQUE INDEX IF NOT EXISTS e
    // ADD CONSTRAINT guardado por pg_constraint. Reaplicar passa e não muda
    // nada — a primeira versão desta lista as classificava como one-shot, e o
    // replay corrigiu a suposição.
    "20260811120000_fail_closed_sector_response_cohort_binding.sql",
    "20260812120000_one_active_sector_link_per_cohort.sql",
]);

/**
 * REAPLICAÇÃO DA TASK 10.1 — caracterizada no FIM da execução, nunca antes das
 * provas, por um motivo concreto descoberto nesta onda (achado D8):
 *
 * `20260909221000` e `20260909222000` substituem a MESMA função
 * (`aggregate_cohort_responses`) por `CREATE OR REPLACE`, e 222000 é a versão
 * final. Reaplicar 221000 DEPOIS de 222000 não é idempotência — é REGRESSÃO:
 * o corpo volta ao que só tinha supressão diferencial, e o release em lote
 * desaparece. Uma versão anterior deste script reaplicava as duas ANTES das
 * suítes e só passava porque a reaplicação de 222000, logo em seguida,
 * restaurava a função por acidente de ordem. No modo `upgrade` — onde já existe
 * publicação e 222000 recusa reaplicar — o acidente não acontecia e a suíte 06
 * falhava contra uma função regredida.
 *
 * Lição encodada aqui: ordem de reaplicação de migrations que compartilham o
 * mesmo objeto é significativa, e o replay tem de dizer isso em voz alta em vez
 * de depender dela.
 */
/**
 * REAPLICAÇÃO DEPENDENTE DE ESTADO — achado da macro-onda 10.2 (defeito D4).
 *
 * `20260909222000` é idempotente ENQUANTO nada foi publicado: o `INSERT` do
 * bootstrap é guardado por `NOT EXISTS` e semeia 0 linhas. Mas a invariante
 * final do bootstrap é GLOBAL
 * (`IF EXISTS (SELECT 1 FROM cohort_capsules WHERE item_means IS NOT NULL)`),
 * então depois de qualquer publicação legítima uma reexecução ABORTA com
 * `FALHA: o bootstrap publicou agregado`. Não é falha de segurança — é
 * fail-closed excessivo, e a mensagem confunde quem retoma uma janela.
 *
 * As duas metades são caracterizadas em `caracterizarReaplicacaoTask10()`, junto
 * com o achado D8 acima. Corrigir a invariante para o escopo das linhas semeadas
 * nesta execução é a menor correção proposta, e exige autorização própria — não
 * foi feita aqui.
 */

const NAO_EXECUTAVEIS = new Map([
    [
        "20260806210000_drop_response_invite_link_contract_production.sql",
        "aborta sempre na precondition 1.6 (pg_get_functiondef sobre agregados); substituída no pacote G1",
    ],
]);

const CONTAINER = "vitalos-fibt-replay";
const IMAGE = "postgres:17-alpine";
const DB = "fibt_replay";
const PGUSER = "postgres";
const PGPASSWORD = "replay-local-only";

const args = process.argv.slice(2);
const modo = (args.find((a) => a.startsWith("--mode="))?.slice(7) ?? "clean") as
    | "clean"
    | "preprod"
    | "upgrade";
const manter = args.includes("--keep");
const inventario = args.includes("--inventory");

if (modo !== "clean" && modo !== "preprod" && modo !== "upgrade") {
    console.error(
        `Modo inválido: ${modo}. Use --mode=clean, --mode=preprod ou --mode=upgrade.`,
    );
    process.exit(1);
}

interface Passo {
    rotulo: string;
    ok: boolean;
    detalhe?: string;
}

const passos: Passo[] = [];
let falhou = false;

function registrar(rotulo: string, ok: boolean, detalhe?: string): void {
    passos.push({ rotulo, ok, detalhe });
    if (!ok) falhou = true;
    console.log(`${ok ? "  ok  " : " FAIL "} ${rotulo}${detalhe && !ok ? ` — ${detalhe}` : ""}`);
}

async function docker(
    argv: string[],
    stdin?: string,
): Promise<{ code: number; out: string; err: string }> {
    const proc = Bun.spawn(["docker", ...argv], {
        stdin: stdin === undefined ? "ignore" : new TextEncoder().encode(stdin),
        stdout: "pipe",
        stderr: "pipe",
    });
    const [out, err] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
    ]);
    const code = await proc.exited;
    return { code, out, err };
}

/**
 * Executa SQL no container. ON_ERROR_STOP=1: qualquer erro aborta e falha.
 *
 * FIDELIDADE DE TRANSAÇÃO — não é detalhe. As migrations deste projeto foram
 * aplicadas pelo SQL Editor do painel, que envolve o script INTEIRO em UMA
 * transação. Várias delas dependem disso: capturam estado no preflight com
 * `set_config(..., is_local => true)` e comparam no postflight. Em autocommit,
 * cada statement é sua própria transação e o valor LOCAL é descartado antes do
 * postflight ler — a migration então acusa uma mudança que nunca houve.
 *
 * Foi exatamente o que aconteceu na primeira tentativa deste replay: o postflight
 * de 20260806205000 reportou "a ACL da funcao mudou" quando nada havia mudado.
 * O defeito era do harness, não da migration. Rodar em transação única elimina a
 * classe inteira desse falso positivo — e um falso positivo aqui é pior que
 * ruído: ensina a ignorar o gate.
 *
 * Arquivos que já gerenciam a própria transação (BEGIN/COMMIT explícitos) rodam
 * como estão, para não aninhar e mudar o significado do COMMIT interno.
 */
async function psql(
    sql: string,
    database = DB,
): Promise<{ code: number; out: string; err: string }> {
    const gerenciaPropriaTransacao = /^\s*BEGIN\s*;/im.test(sql);
    return docker(
        [
            "exec",
            "-i",
            "-e",
            `PGPASSWORD=${PGPASSWORD}`,
            CONTAINER,
            "psql",
            "-v",
            "ON_ERROR_STOP=1",
            ...(gerenciaPropriaTransacao ? [] : ["--single-transaction"]),
            "--quiet",
            "--no-psqlrc",
            "-U",
            PGUSER,
            "-d",
            database,
            "-f",
            "-",
        ],
        sql,
    );
}

/** Consulta de uma linha/uma coluna, sem alinhamento — para asserções. */
async function scalar(sql: string, database = DB): Promise<string> {
    const r = await docker(
        [
            "exec",
            "-i",
            "-e",
            `PGPASSWORD=${PGPASSWORD}`,
            CONTAINER,
            "psql",
            "-v",
            "ON_ERROR_STOP=1",
            "-tAq",
            "--no-psqlrc",
            "-U",
            PGUSER,
            "-d",
            database,
            "-f",
            "-",
        ],
        sql,
    );
    if (r.code !== 0) throw new Error(r.err.trim());
    return r.out.trim();
}

async function subirContainer(): Promise<void> {
    await docker(["rm", "-f", CONTAINER]);

    const up = await docker([
        "run",
        "-d",
        "--name",
        CONTAINER,
        "-e",
        `POSTGRES_PASSWORD=${PGPASSWORD}`,
        "-e",
        `POSTGRES_DB=${DB}`,
        "--tmpfs",
        "/var/lib/postgresql/data",
        IMAGE,
    ]);
    if (up.code !== 0) {
        registrar("container de replay iniciado", false, up.err.trim() || up.out.trim());
        throw new Error("docker run falhou");
    }

    // Espera de prontidão — NÃO usar pg_isready aqui.
    //
    // A imagem oficial do postgres sobe um servidor TEMPORÁRIO durante o initdb
    // (para criar o banco e rodar scripts de inicialização) e depois o derruba
    // para subir o definitivo. pg_isready responde OK nessa fase intermediária,
    // e o replay então tentava aplicar o shim exatamente na janela em que o
    // socket desaparece — falha intermitente, do tipo que faz alguém "rodar de
    // novo" em vez de confiar no gate.
    //
    // O critério aqui é uma consulta real bem-sucedida DUAS vezes seguidas, com
    // intervalo: o servidor temporário não sobrevive a isso.
    let seguidas = 0;
    for (let i = 0; i < 120; i += 1) {
        const r = await docker([
            "exec",
            "-e",
            `PGPASSWORD=${PGPASSWORD}`,
            CONTAINER,
            "psql",
            "-tAq",
            "-U",
            PGUSER,
            "-d",
            DB,
            "-c",
            "SELECT 1",
        ]);
        seguidas = r.code === 0 && r.out.trim() === "1" ? seguidas + 1 : 0;
        if (seguidas >= 2) {
            registrar("container de replay iniciado", true);
            return;
        }
        await Bun.sleep(500);
    }
    registrar("container de replay iniciado", false, "postgres não aceitou consulta em 60s");
    throw new Error("timeout aguardando postgres");
}

/** Todos os arquivos, em ordem lexicográfica = a ordem que o Supabase CLI usaria. */
function migrationsOrdenadas(): string[] {
    const dir = join(raiz, "supabase", "migrations");
    return [...new Glob("*.sql").scanSync({ cwd: dir })].sort();
}

/**
 * A linhagem de produção replayável: tudo, menos as exclusivas de staging e as
 * comprovadamente não executáveis. As duas exclusões são declaradas e
 * reportadas na saída — a ideia é que ninguém leia "replay verde" sem ver
 * exatamente o que ficou fora e por quê.
 */
function linhagemDeProducao(): string[] {
    return migrationsOrdenadas().filter(
        (n) => !STAGING_ONLY_MIGRATIONS.has(n) && !NAO_EXECUTAVEIS.has(n),
    );
}

function lerSql(...partes: string[]): string {
    return readFileSync(join(raiz, ...partes), "utf8");
}

async function aplicarArquivo(rotulo: string, ...partes: string[]): Promise<boolean> {
    const r = await psql(lerSql(...partes));
    const ok = r.code === 0;
    registrar(rotulo, ok, ok ? undefined : r.err.trim().split("\n").slice(0, 6).join(" | "));
    return ok;
}

/**
 * Compensação de linhagem duplicada — ver supabase/local/lineage/README.md.
 *
 * Duas migrations deste repositório (as de nome UUID de 2026-07-03 20:36/20:37)
 * são eco gerado pelo Lovable das migrations escritas à mão e retrodatadas no
 * mesmo dia. O conteúdo se sobrepõe e, em ordem lexicográfica, a segunda
 * tentativa de criar o MESMO objeto aborta a cadeia. Em produção isso nunca
 * apareceu porque a aplicação foi pelo SQL Editor, statement a statement.
 *
 * Os arquivos históricos NÃO são editados: seus hashes estão fixados no
 * manifesto verificável e citados em documento de prova anterior
 * (docs/fibt-prod-proof/PROD06_NONPROD_PROOF_PLAN.md). Reescrevê-los
 * invalidaria a cadeia de custódia para resolver um problema que é só de replay.
 *
 * A compensação roda IMEDIATAMENTE ANTES da migration duplicada, apenas no
 * replay local, e é sempre um DROP ... IF EXISTS do objeto que a duplicata vai
 * recriar de forma idêntica. Não mascara erro: se o objeto não existisse, o
 * DROP é no-op e a criação segue; qualquer erro NOVO continua abortando.
 */
function compensacaoDeLinhagem(nome: string): string | null {
    const caminho = join(raiz, "supabase", "local", "lineage", nome);
    return existsSync(caminho) ? caminho : null;
}

async function aplicarCadeia(nomes: string[], rotulo: string): Promise<boolean> {
    let compensadas = 0;
    for (const nome of nomes) {
        const compensacao = compensacaoDeLinhagem(nome);
        if (compensacao) {
            const c = await psql(readFileSync(compensacao, "utf8"));
            if (c.code !== 0) {
                registrar(
                    `${rotulo}: compensação de linhagem de ${nome}`,
                    false,
                    c.err.trim().split("\n").slice(0, 6).join(" | "),
                );
                return false;
            }
            compensadas += 1;
        }

        const r = await psql(lerSql("supabase", "migrations", nome));
        if (r.code !== 0) {
            registrar(
                `${rotulo}: ${nome}`,
                false,
                r.err.trim().split("\n").slice(0, 8).join(" | "),
            );
            return false;
        }
    }
    registrar(
        `${rotulo} (${nomes.length} migration(s)` +
        (compensadas > 0
            ? `, ${compensadas} com compensação de linhagem declarada)`
            : ")"),
        true,
    );
    return true;
}

// ── Ensaio de ATUALIZAÇÃO (modo `upgrade`) ──────────────────────────────────
//
// POR QUE ESTE MODO EXISTE: `clean` prova que um clone reproduz o schema desde
// banco VAZIO, e `preprod` prova o pacote sobre o estado observado de produção.
// Nenhum dos dois exercitava o que uma janela de mudança realmente faz: aplicar
// as migrations sobre um banco que JÁ TEM dados. Isso importa aqui porque o
// bootstrap de `20260909222000` só faz alguma coisa quando existem respostas —
// no `clean` ele semeia 0 linhas, e a suíte 06 apenas SIMULA o INSERT do
// bootstrap ("MESMA forma de INSERT do bootstrap da migration"). Ou seja: o
// bloco `DO $bootstrap$` real nunca havia rodado contra banco não vazio em
// lugar nenhum.
//
// Este modo fecha essa lacuna dentro do repositório, sem harness externo:
// reconstrói a linhagem SEM as três migrations, semeia dados SINTÉTICOS com
// partição conhecida, mede o observável ANTES, aplica as três medindo duração,
// e mede o observável DEPOIS.

const SEMEADURA_SINTETICA = `
DO $seed$
DECLARE
  c_org  CONSTANT UUID := 'e0000000-0000-4000-8000-0000000000f1';
  c_onda CONSTANT UUID := 'e0000000-0000-4000-8000-0000000000f2';
  c_a    CONSTANT UUID := 'e0000000-0000-4000-8000-0000000000fa';
  c_b    CONSTANT UUID := 'e0000000-0000-4000-8000-0000000000fb';
  c_c    CONSTANT UUID := 'e0000000-0000-4000-8000-0000000000fc';
  c_d    CONSTANT UUID := 'e0000000-0000-4000-8000-0000000000fd';
  c_user CONSTANT UUID := 'e0000000-0000-4000-8000-0000000000f9';
  v_ans  JSONB;
BEGIN
  -- 32 itens na escala 0-4, como o contrato congelado exige.
  SELECT jsonb_object_agg(i::TEXT, 2) INTO v_ans FROM generate_series(1,32) i;

  INSERT INTO public.organizations (id, slug, name)
  VALUES (c_org, 'org-ensaio-upgrade', 'Org Ensaio Upgrade (sintetico)')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.waves (id, org_id, instrument, label, status)
  VALUES (c_onda, c_org, 'FIB_T', 'Onda Ensaio Upgrade', 'collecting')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wave_cohorts (id, org_id, wave_id, key, label) VALUES
    (c_a, c_org, c_onda, 'seg-a', 'Segmento A'),
    (c_b, c_org, c_onda, 'seg-b', 'Segmento B'),
    (c_c, c_org, c_onda, 'seg-c', 'Segmento C'),
    (c_d, c_org, c_onda, 'seg-d', 'Segmento D')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO auth.users (id, email) VALUES (c_user, 'ensaio-upgrade@exemplo.invalid')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.profiles (id, org_id, role, display_name)
  VALUES (c_user, c_org, 'RH_ADMIN', 'Gestor Ensaio') ON CONFLICT (id) DO NOTHING;

  -- Partição deliberada: A=9 e B=6 visiveis, C=3 e D=2 ocultos. DOIS ocultos
  -- para que a supressao complementar NAO dispare e o estado observavel seja
  -- justamente o de espera por lote.
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_a, v_ans FROM generate_series(1,9);
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_b, v_ans FROM generate_series(1,6);
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_c, v_ans FROM generate_series(1,3);
  INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
  SELECT c_onda, c_d, v_ans FROM generate_series(1,2);
END
$seed$;
`;

const ENSAIO_ONDA = "e0000000-0000-4000-8000-0000000000f2";
const ENSAIO_SEG_A = "e0000000-0000-4000-8000-0000000000fa";
const ENSAIO_SEG_C = "e0000000-0000-4000-8000-0000000000fc";
const ENSAIO_USER = "e0000000-0000-4000-8000-0000000000f9";

/** Executa como membro autenticado da organização sintética, via JWT de sessão. */
function comoMembroSintetico(sql: string): string {
    return `BEGIN;
DO $claims$ BEGIN PERFORM set_config('request.jwt.claims',
  json_build_object('sub','${ENSAIO_USER}','role','authenticated')::TEXT, true); END $claims$;
${sql}
COMMIT;`;
}

function leituraDeSegmento(cohort: string): string {
    return comoMembroSintetico(
        `SELECT visible::TEXT || '|' || COALESCE(response_count::TEXT,'NULL') || '|' ||
                COALESCE(response_count_label,'NULL') || '|' ||
                COALESCE(suppression_reason,'NULL') || '|' ||
                COALESCE(left(item_means::TEXT, 20),'NULL')
           FROM public.aggregate_cohort_responses('${ENSAIO_ONDA}','${cohort}');`,
    );
}

const ACL_WAVES_SQL = `SELECT
  has_table_privilege('authenticated','public.waves','INSERT')::TEXT || '/' ||
  has_table_privilege('authenticated','public.waves','UPDATE')::TEXT || '/' ||
  has_table_privilege('authenticated','public.waves','DELETE')::TEXT || '/' ||
  has_table_privilege('authenticated','public.waves','SELECT')::TEXT || ' policy=' ||
  (EXISTS (SELECT 1 FROM pg_policies
            WHERE schemaname='public' AND tablename='waves'
              AND policyname='waves_admin_write'))::TEXT;`;

async function rodarEnsaioDeAtualizacao(anteriores: string[]): Promise<void> {
    if (!(await aplicarCadeia(anteriores, "estado ANTERIOR à Task 10.1 reproduzido"))) {
        throw new Error("cadeia anterior falhou");
    }

    const aclAntes = await scalar(ACL_WAVES_SQL);
    registrar(
        "PRÉ: authenticated tinha DML direto em public.waves (bypass do gate de plano)",
        aclAntes.startsWith("true/true/true/true") && aclAntes.includes("policy=true"),
        aclAntes,
    );
    const capsulaAntes = await scalar(
        "SELECT (to_regclass('public.cohort_capsules') IS NOT NULL)::TEXT;",
    );
    registrar("PRÉ: cohort_capsules ainda não existe", capsulaAntes === "false", capsulaAntes);

    const seed = await psql(SEMEADURA_SINTETICA);
    registrar(
        "dados SINTÉTICOS semeados (partição A=9 · B=6 · C=3 · D=2, 32 itens cada)",
        seed.code === 0,
        seed.code === 0 ? undefined : seed.err.trim().split("\n").slice(0, 4).join(" | "),
    );
    if (seed.code !== 0) throw new Error("semeadura falhou");

    const preA = await scalar(leituraDeSegmento(ENSAIO_SEG_A));
    registrar(
        "PRÉ: segmento com n=9 devolvia a MÉDIA AO VIVO (a exposição temporal existia)",
        preA.startsWith("true|9|9|NULL|"),
        preA,
    );

    // ── Aplicação medida ────────────────────────────────────────────────────
    const duracoes: string[] = [];
    for (const nome of PACOTE_TASK_10_1) {
        const t0 = Date.now();
        const ok = await aplicarArquivo(`Task 10.1 aplicada: ${nome}`, "supabase", "migrations", nome);
        duracoes.push(`${nome.slice(0, 14)}=${Date.now() - t0}ms`);
        if (!ok) throw new Error(`Task 10.1 falhou em ${nome}`);
    }
    console.log(`         duração medida (dataset sintético pequeno): ${duracoes.join(" · ")}`);

    // ── Bootstrap REAL sobre banco não vazio ────────────────────────────────
    const capsulas = await scalar(
        `SELECT COUNT(*)::TEXT || '|' ||
                COUNT(*) FILTER (WHERE item_means IS NULL)::TEXT || '|' ||
                COUNT(*) FILTER (WHERE published_response_count IS NULL)::TEXT || '|' ||
                COALESCE(MAX(array_length(published_response_ids,1))::TEXT,'0')
           FROM public.cohort_capsules;`,
    );
    registrar(
        "bootstrap REAL semeou 2 baselines NÃO PUBLICADOS (A=9 e B=6) e 0 publicados",
        capsulas === "2|2|2|9",
        `linhas|means_null|count_null|max_ids = ${capsulas}`,
    );

    const aclDepois = await scalar(ACL_WAVES_SQL);
    registrar(
        "PÓS: authenticated sem INSERT/UPDATE/DELETE em waves, SELECT preservado, policy removida",
        aclDepois === "false/false/false/true policy=false",
        aclDepois,
    );

    const posA = await scalar(leituraDeSegmento(ENSAIO_SEG_A));
    registrar(
        "PÓS: n=9 deixa de expor média ao vivo e responde awaiting_batched_release",
        posA === "false|NULL|NULL|awaiting_batched_release|NULL",
        posA,
    );

    const posC = await scalar(leituraDeSegmento(ENSAIO_SEG_C));
    registrar(
        "PÓS: n=3 responde privacy_threshold com rótulo de faixa <5",
        posC === "false|NULL|<5|privacy_threshold|NULL",
        posC,
    );

    // +4 contribuintes novos: nada observável muda.
    await psql(`INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
      SELECT '${ENSAIO_ONDA}','${ENSAIO_SEG_A}',
             (SELECT jsonb_object_agg(i::TEXT, 4) FROM generate_series(1,32) i)
        FROM generate_series(1,4);`);
    const pos4 = await scalar(leituraDeSegmento(ENSAIO_SEG_A));
    registrar(
        "PÓS: +4 contribuintes novos NÃO publicam (nada observável se move)",
        pos4 === "false|NULL|NULL|awaiting_batched_release|NULL",
        pos4,
    );

    // 5º contribuinte novo: publica de uma vez.
    await psql(`INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
      VALUES ('${ENSAIO_ONDA}','${ENSAIO_SEG_A}',
              (SELECT jsonb_object_agg(i::TEXT, 4) FROM generate_series(1,32) i));`);
    const pos5 = await scalar(leituraDeSegmento(ENSAIO_SEG_A));
    registrar(
        "PÓS: 5º contribuinte novo publica snapshot atômico com contagem 14",
        pos5.startsWith("true|14|14|NULL|"),
        pos5,
    );
}

/**
 * Caracteriza a reaplicação das três migrations da Task 10.1 — depois das
 * provas, porque duas delas compartilham a mesma função e a ORDEM importa.
 *
 * Deixa o banco deliberadamente REGREDIDO no final (o container é descartado em
 * seguida): a última verificação é justamente que reaplicar 221000 sobre 222000
 * remove o release em lote.
 */
async function caracterizarReaplicacaoTask10(): Promise<void> {
    const publicadasSql =
        "SELECT COUNT(*)::TEXT FROM public.cohort_capsules WHERE item_means IS NOT NULL;";
    const temReleaseEmLote = async (database = DB) =>
        (await scalar(
            `SELECT (pg_get_functiondef(to_regprocedure('public.aggregate_cohort_responses(uuid,uuid)')) ~* 'cohort_capsules')::TEXT;`,
            database,
        )) === "true";

    // 1. Bloqueio de escrita direta em `waves` — não toca a função, reaplicar é
    //    idempotente em qualquer ordem.
    const lockdown = await psql(lerSql("supabase", "migrations", TASK_10_1_WAVES_LOCKDOWN));
    registrar(
        `idempotente ao reaplicar em qualquer ordem: ${TASK_10_1_WAVES_LOCKDOWN}`,
        lockdown.code === 0,
        lockdown.code === 0 ? undefined : lockdown.err.trim().split("\n").slice(0, 3).join(" | "),
    );

    // 2. Metade 1 de D4, num CLONE: sem publicação, a reaplicação de 222000
    //    PASSA. O clone existe para não precisar apagar publicação do banco de
    //    prova só para montar a precondição.
    await comCloneLocal("task10_sem_publicacao", async (database) => {
        const limpeza = await psql(
            "UPDATE public.cohort_capsules SET item_means = NULL, published_response_count = NULL, published_at = NULL;",
            database,
        );
        if (limpeza.code !== 0) {
            registrar("clone sem publicação preparado", false, limpeza.err.trim());
            return;
        }
        const r = await psql(lerSql("supabase", "migrations", TASK_10_1_BATCHED_RELEASE), database);
        registrar(
            `reaplicável enquanto nada foi publicado: ${TASK_10_1_BATCHED_RELEASE}`,
            r.code === 0,
            r.code === 0 ? undefined : r.err.trim().split("\n").filter((l) => /ERROR|FALHA/.test(l)).slice(0, 2).join(" | "),
        );
        registrar(
            "clone conserva o release em lote depois da reaplicação",
            await temReleaseEmLote(database),
        );
    });

    // 3. Metade 2 de D4: com publicação existente, a MESMA migration recusa —
    //    por uma invariante GLOBAL do bootstrap, não por drift real.
    const publicadas = await scalar(publicadasSql);
    const comPublicacao = await psql(lerSql("supabase", "migrations", TASK_10_1_BATCHED_RELEASE));
    const recusouPorInvariante =
        comPublicacao.code !== 0 && /o bootstrap publicou agregado/i.test(comPublicacao.err);
    registrar(
        `reaplicação recusada DEPOIS de haver publicação (D4 — fail-closed excessivo, não drift): ${TASK_10_1_BATCHED_RELEASE} (publicadas=${publicadas})`,
        publicadas === "0" ? comPublicacao.code === 0 : recusouPorInvariante,
        publicadas === "0"
            ? "nenhuma publicação existia — metade 2 não exercitada nesta execução"
            : recusouPorInvariante
                ? undefined
                : "esperava recusa pela invariante global do bootstrap",
    );

    // 4. D8: reaplicar 221000 DEPOIS de 222000 é REGRESSÃO, não idempotência.
    //    O SQL passa (é um CREATE OR REPLACE válido) e justamente por isso o
    //    risco é silencioso — o replay o torna audível.
    //
    //    Feito num CLONE, não no banco de prova: `--keep` precisa deixar o
    //    container no estado FINAL correto, porque `bun run proof:concurrency`
    //    roda em seguida contra ele e depende do release em lote estar presente.
    await comCloneLocal("task10_downgrade_hazard", async (database) => {
        const antes = await temReleaseEmLote(database);

        // O guard de procedimento (scripts/fibt-hml/guard-against-221000-isolated-reapply.sql)
        // tem de BLOQUEAR aqui — antes de qualquer tentativa de reaplicar a
        // 221000 isolada. É a mesma checagem que o operador humano roda no SQL
        // Editor antes de colar o corpo da migration.
        const guard = await psql(
            lerSql("scripts", "fibt-hml", "guard-against-221000-isolated-reapply.sql"),
            database,
        );
        const guardBloqueou =
            guard.code !== 0 && /GUARD_VERDICT=BLOQUEAR_REAPLICACAO_ISOLADA_221000/i.test(guard.err);
        registrar(
            "guard de procedimento bloqueia a reaplicação isolada de 221000 quando 222000 já está ativa",
            guardBloqueou,
            guardBloqueou ? undefined : guard.err.trim().split("\n").slice(0, 4).join(" | "),
        );

        const downgrade = await psql(lerSql("supabase", "migrations", TASK_10_1_DIFFERENTIAL), database);
        const depois = await temReleaseEmLote(database);
        registrar(
            `D8: reaplicar ${TASK_10_1_DIFFERENTIAL} sobre ${TASK_10_1_BATCHED_RELEASE} REGRIDE a função (perde o release em lote) — o guard acima é o único controle; o SQL em si não recusa — ordem de reaplicação é significativa`,
            downgrade.code === 0 && antes && !depois,
            `sql_ok=${downgrade.code === 0} · release_em_lote_antes=${antes} · depois=${depois}`,
        );
    });

    registrar(
        "banco de prova permanece no estado FINAL correto (release em lote presente)",
        await temReleaseEmLote(),
    );
}

async function rodarProvas(): Promise<void> {
    const dir = join(raiz, "supabase", "tests");
    if (!existsSync(dir)) {
        registrar("suítes de prova encontradas", false, "supabase/tests/ não existe");
        return;
    }
    const suites = [...new Glob("*.sql").scanSync({ cwd: dir })].sort();
    if (suites.length === 0) {
        registrar("suítes de prova encontradas", false, "nenhum .sql em supabase/tests/");
        return;
    }
    for (const suite of suites) {
        const r = await psql(lerSql("supabase", "tests", suite));
        const ok = r.code === 0;
        // As suítes usam RAISE NOTICE para cada invariante provada; em falha, a
        // mensagem da exceção é o que interessa.
        const notas = (ok ? r.err : r.err)
            .split("\n")
            .filter((l) => l.includes("PROVEN:") || l.includes("FAILED:") || l.includes("ERROR"))
            .slice(0, 40);
        registrar(
            `prova ${suite}`,
            ok,
            ok ? undefined : notas.join(" | ") || r.err.trim().slice(0, 500),
        );
        if (ok) for (const n of notas) console.log(`         ${n.replace(/^NOTICE:\s*/, "")}`);
    }
}

async function comCloneLocal(
    nome: string,
    prova: (database: string) => Promise<void>,
): Promise<void> {
    await docker(["exec", "-e", `PGPASSWORD=${PGPASSWORD}`, CONTAINER, "dropdb", "--if-exists", "--force", "-U", PGUSER, nome]);
    const clone = await docker([
        "exec", "-e", `PGPASSWORD=${PGPASSWORD}`, CONTAINER,
        "createdb", "-U", PGUSER, "-T", DB, nome,
    ]);
    if (clone.code !== 0) {
        registrar(`clone local ${nome}`, false, clone.err.trim() || clone.out.trim());
        return;
    }
    try {
        await prova(nome);
    } finally {
        await docker(["exec", "-e", `PGPASSWORD=${PGPASSWORD}`, CONTAINER, "dropdb", "--if-exists", "--force", "-U", PGUSER, nome]);
    }
}

// ── IVO R6 — atualização a partir da versão defeituosa (achado R6-C1) ───────
//
// A primeira versão de 20261002120000 tinha CHECKs que avaliavam para NULL
// (meia-proveniência aceita). Um banco que já a aplicou guarda a constraint
// antiga com o MESMO nome, e `IF NOT EXISTS` não a trocaria. Aqui o defeito é
// reinstalado de propósito, a migration corrigida é reaplicada e o banco tem
// de terminar com a regra nova.
const R6_CHECKS_DEFEITUOSOS = `
ALTER TABLE public.action_items
  DROP CONSTRAINT IF EXISTS action_items_source_complete_ck,
  ADD CONSTRAINT action_items_source_complete_ck CHECK (
    (source_lens_id IS NULL AND source_wave_id IS NULL AND source_cohort_id IS NULL
      AND source_factor_id IS NULL AND source_instrument_version IS NULL AND source_published_at IS NULL)
    OR (source_lens_id = 'fibt' AND source_wave_id IS NOT NULL AND source_cohort_id IS NOT NULL
      AND source_factor_id ~ '^[a-z][a-z_]{0,39}$' AND source_instrument_version IS NOT NULL
      AND source_published_at IS NOT NULL)),
  DROP CONSTRAINT IF EXISTS action_items_source_no_ivo_lift_ck,
  ADD CONSTRAINT action_items_source_no_ivo_lift_ck CHECK (source_lens_id IS NULL OR expected_ivo_lift = 0);`;

const R6_CHECKS_CORRETOS_SQL = `SELECT string_agg(conname || '=' || (pg_get_constraintdef(oid) LIKE '%IS TRUE%' AND pg_get_constraintdef(oid) LIKE '%num_nonnulls%')::TEXT, ',' ORDER BY conname)
  FROM pg_constraint WHERE conname IN ('action_items_source_complete_ck','action_items_source_no_ivo_lift_ck');`;

async function caracterizarAtualizacaoR6(pacoteR6: string[]): Promise<void> {
    const regride = await psql(R6_CHECKS_DEFEITUOSOS);
    if (regride.code !== 0) {
        registrar("R6: reinstalar CHECKs da versão defeituosa (preparo do ensaio)", false, regride.err.trim().slice(0, 300));
        return;
    }
    const antes = await scalar(R6_CHECKS_CORRETOS_SQL);
    for (const nome of pacoteR6) {
        const r = await psql(lerSql("supabase", "migrations", nome));
        if (r.code !== 0) {
            registrar(`R6: atualização a partir da versão defeituosa (${nome})`, false, r.err.trim().slice(0, 300));
            return;
        }
    }
    const depois = await scalar(R6_CHECKS_CORRETOS_SQL);
    const esperado = "action_items_source_complete_ck=true,action_items_source_no_ivo_lift_ck=true";
    registrar(
        "R6: atualização substitui os CHECKs defeituosos da versão anterior (R6-C1)",
        antes !== esperado && depois === esperado,
        `antes=${antes} · depois=${depois}`,
    );
}

// ── IVO R6 — promoção mínima do módulo Action Plan sobre o estado produtivo ─
//
// No `preprod` o módulo não existe (20_production_absent_...), e a suíte 07
// só prova constraints/RLS — o caminho de RPC sai como SKIP, e SKIP não prova
// que R6 funciona num ambiente assim. Num CLONE local, aplica a promoção
// mínima na ordem do runbook (ledger 20260705100000 → R6), confere o corpo da
// RPC, reconcilia a M6A e roda a suíte 07 exigindo o caminho de RPC PROVADO.
async function provarPromocaoActionPlan(pacoteR6: string[], pacoteC8: string[], pacotePI13: string[]): Promise<void> {
    await comCloneLocal("r6_action_plan_promotion", async (database) => {
        for (const nome of ["20260705100000_action_plan_ledger.sql", ...pacoteR6, ...pacoteC8, ...pacotePI13]) {
            const r = await psql(lerSql("supabase", "migrations", nome), database);
            if (r.code !== 0) {
                registrar(`R6 promoção: ${nome} no clone produtivo`, false, r.err.trim().split("\n").slice(0, 6).join(" | "));
                return;
            }
        }
        const corpo = await scalar(
            `SELECT (prosrc LIKE '%provenance_cross_tenant_denied%' AND prosrc LIKE '%source_not_published%')::TEXT
               FROM pg_proc WHERE oid = to_regprocedure('public.create_action_plan(uuid,text,text,uuid,uuid,jsonb)');`,
            database,
        );
        registrar("R6 promoção: create_action_plan com validação de proveniência após ledger → R6", corpo === "true", `corpo=${corpo}`);

        const m6a = await psql(lerSql("supabase", "migrations", M6A_ATUAL), database);
        registrar("R6 promoção: M6A reconcilia a superfície com o módulo Action Plan presente", m6a.code === 0, m6a.code === 0 ? undefined : m6a.err.trim().slice(0, 300));

        const suite = await psql(lerSql("supabase", "tests", "07_fibt_action_provenance.sql"), database);
        const rpcProvado = suite.err.includes("R6_CROSS_TENANT=DENIED") && !suite.err.includes("R6_RPC_PATH=SKIP");
        registrar(
            "R6 promoção: suíte 07 com caminho de RPC PROVADO (não SKIP) no clone produtivo promovido",
            suite.code === 0 && rpcProvado,
            suite.code !== 0 ? suite.err.split("\n").filter((l) => l.includes("FAILED") || l.includes("ERROR") || l.includes("  - ")).slice(0, 12).join(" | ") : `rpc_provado=${rpcProvado}`,
        );
        const c8 = await psql(lerSql("supabase", "tests", "08_ivo_efficacy_protocols.sql"), database);
        const c8Provado = c8.err.includes("C8_PATH=PROVED") && !c8.err.includes("C8_PATH=SKIP");
        registrar(
            "C8 promoção: suíte 08 com caminho completo PROVADO (não SKIP) no clone produtivo promovido",
            c8.code === 0 && c8Provado,
            c8.code !== 0 ? c8.err.split("\n").filter((l) => l.includes("FALHOU") || l.includes("ERROR")).slice(0, 8).join(" | ") : `c8_provado=${c8Provado}`,
        );
        const pi13 = await psql(lerSql("supabase", "tests", "09_ivo_plan_composition_closure.sql"), database);
        const pi13Provado = pi13.err.includes("PI13_PATH=PROVED") && !pi13.err.includes("PI13_PATH=SKIP");
        registrar(
            "PI-13 promoção: suíte 09 com caminho completo PROVADO (não SKIP) no clone produtivo promovido",
            pi13.code === 0 && pi13Provado,
            pi13.code !== 0 ? pi13.err.split("\n").filter((l) => l.includes("FAILED") || l.includes("ERROR") || l.includes("  - ")).slice(0, 12).join(" | ") : `pi13_provado=${pi13Provado}`,
        );
        // A M6A reconcilia a superfície DEPOIS do PI-13: gatilhos em ivo_ledger e nenhuma função nova em public.
        const m6aDepois = await psql(lerSql("supabase", "migrations", M6A_ATUAL), database);
        registrar(
            "PI-13: M6A reaplicada com o PI-13 presente reconcilia a superfície (sem função nova em public)",
            m6aDepois.code === 0,
            m6aDepois.code === 0 ? undefined : m6aDepois.err.trim().slice(0, 300),
        );
    });
}

// ── IVO PI-13 — atualização a partir do estado anterior, com dados do ledger ─
//
// O clone CLONE_PI13_ANTERIOR guarda o estado ANTES da migration nova. Aqui o
// módulo Action Plan é promovido nele (ledger → R6 → C8), um plano real é criado
// e movimentado pelas RPCs EXISTENTES, e só então a migration PI-13 é aplicada
// por cima. Provas: (1) nenhuma linha anterior muda; (2) as RPCs existentes
// seguem funcionando sobre o banco atualizado, inclusive criar plano e ativar
// (o gatilho de plano admite draft→active); (3) o encerramento recusa
// pendência, aceita quando tudo está em estado de saída e passa a barrar as RPCs
// de escrita sobre o plano encerrado; (4) a avaliação C8 não é tocada.
const PI13_ESTADO_ANTERIOR_SQL = `
CREATE SCHEMA IF NOT EXISTS _proof;
CREATE TABLE IF NOT EXISTS _proof.pi13_state (k TEXT PRIMARY KEY, v TEXT);
DO $anterior$
DECLARE
  c_org  CONSTANT UUID := 'aa000000-0000-4000-8000-0000000000a1';
  c_usr  CONSTANT UUID := 'aa000000-0000-4000-8000-0000000000a9';
  c_wave CONSTANT UUID := 'aa000000-0000-4000-8000-0000000000a2';
  c_coh  CONSTANT UUID := 'aa000000-0000-4000-8000-0000000000a3';
  v_ok BOOLEAN; v_reason TEXT; v_plan UUID; v_i1 UUID; v_i2 UUID; v_ev UUID;
BEGIN
  INSERT INTO public.organizations (id, slug, name) VALUES (c_org, 'org-ficticia-pi13-up', 'Org Fictícia PI13 Upgrade');
  INSERT INTO auth.users (id, email) VALUES (c_usr, 'admin-pi13-up@exemplo.invalid');
  INSERT INTO public.profiles (id, org_id, role, display_name) VALUES (c_usr, c_org, 'RH_ADMIN', 'Admin Upgrade');
  INSERT INTO public.waves (id, org_id, instrument, instrument_version, label, status) VALUES (c_wave, c_org, 'FIB_T', '1.0.0', 'Onda upgrade', 'collecting');
  INSERT INTO public.wave_cohorts (id, org_id, wave_id, key, label) VALUES (c_coh, c_org, c_wave, 'up-1', 'Setor Upgrade');
  INSERT INTO public.cohort_capsules (org_id, wave_id, cohort_id, published_response_count, published_response_ids, item_means, published_at)
    VALUES (c_org, c_wave, c_coh, 7, '{}', '{"1": 2.5}', '2026-06-20T12:00:00Z');

  SELECT accepted, reason, plan_id INTO v_ok, v_reason, v_plan FROM public.create_action_plan(c_org, '2026-T2', 'Plano anterior', NULL, c_usr,
    jsonb_build_array(
      jsonb_build_object('rank', 1, 'lever_id', 'fibt:up-1:bem_estar', 'title', 'Ação anterior 1', 'effort', 'medio', 'start_week', 1, 'end_week', 13,
        'milestone_week', 7, 'weeks_budget', 13, 'source_lens_id', 'fibt', 'source_wave_id', c_wave, 'source_cohort_id', c_coh, 'source_factor_id', 'bem_estar'),
      jsonb_build_object('rank', 2, 'lever_id', 'fibt:up-1:bem_estar', 'title', 'Ação anterior 2', 'effort', 'baixo', 'start_week', 1, 'end_week', 13,
        'milestone_week', 7, 'weeks_budget', 13, 'source_lens_id', 'fibt', 'source_wave_id', c_wave, 'source_cohort_id', c_coh, 'source_factor_id', 'bem_estar')));
  IF NOT v_ok THEN RAISE EXCEPTION 'estado anterior: create_action_plan recusou (%)', v_reason; END IF;
  SELECT id INTO v_i1 FROM public.action_items WHERE plan_id = v_plan AND rank = 1;
  SELECT id INTO v_i2 FROM public.action_items WHERE plan_id = v_plan AND rank = 2;
  PERFORM public.set_action_item_accountability(v_i1, c_usr, 'Gestão', '2026-12-15', 'Encontros', 0, 4, 'enc', NULL, NULL, NULL, NULL);
  PERFORM public.set_action_item_accountability(v_i2, c_usr, 'Gestão', '2026-12-15', 'Oficinas', 0, 2, 'of', NULL, NULL, NULL, NULL);
  PERFORM public.activate_action_plan(v_plan);
  PERFORM public.record_action_event(v_i1, 'status_change', c_usr, 'RH_ADMIN', 'em_execucao', NULL, NULL);
  PERFORM public.record_action_event(v_i1, 'status_change', c_usr, 'RH_ADMIN', 'concluida', NULL, 'feito');
  SELECT evidence_id INTO v_ev FROM public.record_evidence(v_i1, 'texto', 'Ata do encontro', 'direct', NULL, '2026-07-10', c_usr, 'RH_ADMIN');
  INSERT INTO public.efficacy_protocols (org_id, item_id, revision, created_by, objective)
    VALUES (c_org, v_i1, 1, c_usr, 'Objetivo sintético do estado anterior');
  INSERT INTO _proof.pi13_state VALUES ('plan', v_plan::TEXT), ('i1', v_i1::TEXT), ('i2', v_i2::TEXT);
END
$anterior$;`;

// Fotografia só das colunas que JÁ existiam (as novas nascem nulas).
const PI13_CHECKSUM_SQL = `
SELECT md5(
  COALESCE((SELECT string_agg((to_jsonb(p) - 'closed_at' - 'closed_by' - 'closed_by_role')::TEXT, '|' ORDER BY p.id) FROM public.action_plans p WHERE p.org_id = 'aa000000-0000-4000-8000-0000000000a1'), '') ||
  COALESCE((SELECT string_agg((to_jsonb(i) - 'add_request_id' - 'added_by' - 'added_by_role')::TEXT, '|' ORDER BY i.id) FROM public.action_items i WHERE i.org_id = 'aa000000-0000-4000-8000-0000000000a1'), '') ||
  COALESCE((SELECT string_agg(to_jsonb(e)::TEXT, '|' ORDER BY e.id) FROM public.evidence_records e WHERE e.org_id = 'aa000000-0000-4000-8000-0000000000a1'), '') ||
  COALESCE((SELECT string_agg(to_jsonb(l)::TEXT, '|' ORDER BY l.id) FROM public.action_log l WHERE l.org_id = 'aa000000-0000-4000-8000-0000000000a1'), '') ||
  COALESCE((SELECT string_agg(to_jsonb(c)::TEXT, '|' ORDER BY c.id) FROM public.efficacy_protocols c WHERE c.org_id = 'aa000000-0000-4000-8000-0000000000a1'), ''));`;

async function provarAtualizacaoPI13(pacoteR6: string[], pacoteC8: string[], pacotePI13: string[]): Promise<void> {
    const database = CLONE_PI13_ANTERIOR;
    try {
        for (const nome of ["20260705100000_action_plan_ledger.sql", ...pacoteR6, ...pacoteC8]) {
            const r = await psql(lerSql("supabase", "migrations", nome), database);
            if (r.code !== 0) {
                registrar(`PI-13 atualização: ${nome} no estado anterior`, false, r.err.trim().split("\n").slice(0, 6).join(" | "));
                return;
            }
        }
        const semPI13 = await scalar("SELECT (to_regnamespace('ivo_ledger') IS NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='action_plans' AND column_name='closed_at'))::TEXT;", database);
        registrar("PI-13 atualização: o estado anterior não tem o schema ivo_ledger nem as colunas novas", semPI13 === "true", semPI13);

        const seed = await psql(PI13_ESTADO_ANTERIOR_SQL, database);
        registrar("PI-13 atualização: plano real criado e movimentado pelas RPCs existentes (ativo, 1 ação concluída, evidência, protocolo C8)", seed.code === 0, seed.code === 0 ? undefined : seed.err.trim().split("\n").slice(0, 6).join(" | "));
        if (seed.code !== 0) return;
        const antes = await scalar(PI13_CHECKSUM_SQL, database);

        for (const nome of pacotePI13) {
            const r = await psql(lerSql("supabase", "migrations", nome), database);
            registrar(`PI-13 atualização: ${nome} aplicada por cima do estado anterior`, r.code === 0, r.code === 0 ? undefined : r.err.trim().split("\n").slice(0, 6).join(" | "));
            if (r.code !== 0) return;
        }
        const depois = await scalar(PI13_CHECKSUM_SQL, database);
        registrar("PI-13 atualização: nenhuma linha anterior (plano, ações, evidência, log, protocolo C8) foi alterada", antes === depois, `${antes} → ${depois}`);

        const novas = await scalar(
            `SELECT (SELECT COUNT(*) FROM public.action_plans WHERE closed_at IS NOT NULL OR closed_by IS NOT NULL OR closed_by_role IS NOT NULL)::TEXT || '|' ||
                    (SELECT COUNT(*) FROM public.action_items WHERE add_request_id IS NOT NULL OR added_by IS NOT NULL OR added_by_role IS NOT NULL)::TEXT;`,
            database,
        );
        registrar("PI-13 atualização: colunas novas nascem nulas nas linhas anteriores", novas === "0|0", novas);

        // As RPCs existentes continuam funcionando sobre o banco atualizado.
        const rpcs = await psql(`
DO $rpcs$
DECLARE
  c_org  CONSTANT UUID := 'aa000000-0000-4000-8000-0000000000a1';
  c_usr  CONSTANT UUID := 'aa000000-0000-4000-8000-0000000000a9';
  c_wave CONSTANT UUID := 'aa000000-0000-4000-8000-0000000000a2';
  c_coh  CONSTANT UUID := 'aa000000-0000-4000-8000-0000000000a3';
  v_i2 UUID := (SELECT v::UUID FROM _proof.pi13_state WHERE k = 'i2');
  v_ok BOOLEAN; v_reason TEXT; v_plan2 UUID; v_n UUID; v_acc BOOLEAN;
BEGIN
  SELECT accepted, reason INTO v_ok, v_reason FROM public.record_action_event(v_i2, 'status_change', c_usr, 'RH_ADMIN', 'em_execucao', NULL, NULL);
  IF NOT v_ok THEN RAISE EXCEPTION 'record_action_event recusou após PI-13 (%)', v_reason; END IF;
  SELECT accepted, reason INTO v_ok, v_reason FROM public.record_evidence(v_i2, 'aprendizagem', 'Aprendizado', 'direct', NULL, '2026-07-12', c_usr, 'RH_ADMIN') AS r(accepted, reason, evidence_id);
  IF NOT v_ok THEN RAISE EXCEPTION 'record_evidence recusou após PI-13 (%)', v_reason; END IF;
  SELECT accepted, reason, plan_id INTO v_ok, v_reason, v_plan2 FROM public.create_action_plan(c_org, '2026-T3', 'Segundo plano', NULL, c_usr,
    jsonb_build_array(jsonb_build_object('rank', 1, 'lever_id', 'fibt:up-1:bem_estar', 'title', 'Nova ação', 'effort', 'medio', 'start_week', 1, 'end_week', 13,
      'milestone_week', 7, 'weeks_budget', 13, 'source_lens_id', 'fibt', 'source_wave_id', c_wave, 'source_cohort_id', c_coh, 'source_factor_id', 'bem_estar')));
  IF NOT v_ok THEN RAISE EXCEPTION 'create_action_plan recusou após PI-13 (%)', v_reason; END IF;
  SELECT id INTO v_n FROM public.action_items WHERE plan_id = v_plan2;
  PERFORM public.set_action_item_accountability(v_n, c_usr, 'Gestão', '2026-12-15', 'Encontros', 0, 4, 'enc', NULL, NULL, NULL, NULL);
  SELECT accepted INTO v_acc FROM public.activate_action_plan(v_plan2);
  IF NOT v_acc THEN RAISE EXCEPTION 'activate_action_plan recusou após PI-13'; END IF;
END
$rpcs$;`, database);
        registrar("PI-13 atualização: RPCs existentes (evento, evidência, criar plano, §13, ativar) seguem funcionando", rpcs.code === 0, rpcs.code === 0 ? undefined : rpcs.err.trim().split("\n").slice(0, 6).join(" | "));

        // Encerramento do plano anterior: pendência recusa; concluindo a última, encerra; RPCs passam a recusar.
        const fecha = await psql(`
DO $fecha$
DECLARE
  c_usr CONSTANT UUID := 'aa000000-0000-4000-8000-0000000000a9';
  v_plan UUID := (SELECT v::UUID FROM _proof.pi13_state WHERE k = 'plan');
  v_i1 UUID := (SELECT v::UUID FROM _proof.pi13_state WHERE k = 'i1');
  v_i2 UUID := (SELECT v::UUID FROM _proof.pi13_state WHERE k = 'i2');
  v_ok BOOLEAN; v_reason TEXT; v_msg TEXT;
BEGIN
  BEGIN
    UPDATE public.action_plans SET status = 'closed', closed_by = c_usr, closed_by_role = 'RH_ADMIN' WHERE id = v_plan AND status = 'active';
    RAISE EXCEPTION 'encerrou com ação em execução';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg <> 'ivo_plan_close_pending' THEN RAISE EXCEPTION 'motivo inesperado: %', v_msg; END IF;
  END;
  SELECT accepted, reason INTO v_ok, v_reason FROM public.record_action_event(v_i2, 'status_change', c_usr, 'RH_ADMIN', 'concluida', NULL, NULL);
  IF NOT v_ok THEN RAISE EXCEPTION 'record_action_event recusou (%)', v_reason; END IF;
  UPDATE public.action_plans SET status = 'closed', closed_by = c_usr, closed_by_role = 'RH_ADMIN' WHERE id = v_plan AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'encerramento não gravou'; END IF;
  BEGIN
    PERFORM public.record_action_event(v_i1, 'status_change', c_usr, 'RH_ADMIN', 'em_vigilancia', NULL, NULL);
    RAISE EXCEPTION 'RPC de evento aceitou escrita em plano encerrado';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL;
  END;
  BEGIN
    PERFORM public.record_evidence(v_i1, 'texto', 'tarde', 'direct', NULL, '2026-07-13', c_usr, 'RH_ADMIN');
    RAISE EXCEPTION 'RPC de evidência aceitou escrita em plano encerrado';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL;
  END;
  -- O protocolo C8 do estado anterior segue legível e a avaliação segue possível.
  UPDATE public.efficacy_protocols SET objective = 'Avaliação segue possível depois do encerramento' WHERE item_id = v_i1;
  IF NOT FOUND THEN RAISE EXCEPTION 'protocolo C8 inacessível após o encerramento'; END IF;
END
$fecha$;`, database);
        registrar("PI-13 atualização: encerramento recusa pendência, aceita com tudo em estado de saída, e as RPCs existentes passam a recusar o plano encerrado (C8 segue)", fecha.code === 0, fecha.code === 0 ? undefined : fecha.err.trim().split("\n").slice(0, 8).join(" | "));
    } finally {
        await docker(["exec", "-e", `PGPASSWORD=${PGPASSWORD}`, CONTAINER, "dropdb", "--if-exists", "--force", "-U", PGUSER, CLONE_PI13_ANTERIOR]);
    }
}

async function rodarMatrizNegativaM6A(): Promise<void> {
    const m6a = lerSql("supabase", "migrations", M6A_ATUAL);

    await comCloneLocal("m6a_unknown_attack", async (database) => {
        const setup = await psql(`
CREATE FUNCTION public.m6a_unknown_probe() RETURNS INTEGER
LANGUAGE sql AS $$ SELECT 1 $$;
`, database);
        if (setup.code !== 0) {
            registrar("M6A unknown-function setup", false, setup.err.trim());
            return;
        }
        const r = await psql(m6a, database);
        registrar(
            "M6A aborta função public desconhecida",
            r.code !== 0 && r.err.includes("fora de REQUIRED_NOW + FUTURE_OPTIONAL"),
            r.code === 0 ? "migration aceitou função desconhecida" : r.err.trim().split("\n").slice(0, 3).join(" | "),
        );
    });

    await comCloneLocal("m6a_required_missing", async (database) => {
        const setup = await psql("DROP FUNCTION public.mark_invite_used(TEXT);", database);
        if (setup.code !== 0) {
            registrar("M6A required-missing setup", false, setup.err.trim());
            return;
        }
        const r = await psql(m6a, database);
        registrar(
            "M6A aborta REQUIRED_NOW ausente",
            r.code !== 0 && r.err.includes("REQUIRED_NOW ausente"),
            r.code === 0 ? "migration aceitou required ausente" : r.err.trim().split("\n").slice(0, 3).join(" | "),
        );
    });

    await comCloneLocal("m6a_future_unsafe", async (database) => {
        const setup = await psql(`
DROP FUNCTION IF EXISTS public.record_item_funnel_event(
  TEXT, TEXT, INTEGER, BOOLEAN, INTEGER, JSONB
);
CREATE FUNCTION public.record_item_funnel_event(
  TEXT, TEXT, INTEGER, BOOLEAN, INTEGER, JSONB
) RETURNS TABLE(accepted BOOLEAN, reason TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT TRUE, NULL::TEXT $$;
GRANT EXECUTE ON FUNCTION public.record_item_funnel_event(TEXT,TEXT,INTEGER,BOOLEAN,INTEGER,JSONB)
  TO PUBLIC, anon, authenticated;
`, database);
        if (setup.code !== 0) {
            registrar("M6A future-unsafe setup", false, setup.err.trim());
            return;
        }
        const apply = await psql(m6a, database);
        let estado = "apply_failed";
        if (apply.code === 0) {
            estado = await scalar(`
SELECT
  EXISTS (
    SELECT 1 FROM pg_proc p,
      aclexplode(COALESCE(p.proacl, acldefault('f',p.proowner))) a
     WHERE p.oid=to_regprocedure('public.record_item_funnel_event(text,text,integer,boolean,integer,jsonb)')
       AND a.grantee=0 AND a.privilege_type='EXECUTE'
  )::TEXT || '|' ||
  has_function_privilege('anon',to_regprocedure('public.record_item_funnel_event(text,text,integer,boolean,integer,jsonb)'),'EXECUTE')::TEXT || '|' ||
  has_function_privilege('authenticated',to_regprocedure('public.record_item_funnel_event(text,text,integer,boolean,integer,jsonb)'),'EXECUTE')::TEXT || '|' ||
  has_function_privilege('service_role',to_regprocedure('public.record_item_funnel_event(text,text,integer,boolean,integer,jsonb)'),'EXECUTE')::TEXT;
`, database);
        }
        registrar(
            "M6A reconcilia FUTURE_OPTIONAL presente com EXECUTE inseguro",
            apply.code === 0 && estado === "false|false|false|true",
            apply.code === 0 ? `ACL=${estado}` : apply.err.trim().split("\n").slice(0, 3).join(" | "),
        );
    });

    await comCloneLocal("m6a_unsafe_search_path", async (database) => {
        const setup = await psql(
            "ALTER FUNCTION public.mark_invite_used(TEXT) RESET search_path;",
            database,
        );
        if (setup.code !== 0) {
            registrar("M6A unsafe-search-path setup", false, setup.err.trim());
            return;
        }
        const r = await psql(m6a, database);
        registrar(
            "M6A aborta SECURITY DEFINER sem search_path fixo",
            r.code !== 0 && r.err.includes("SECURITY DEFINER sem search_path fixo"),
            r.code === 0 ? "migration aceitou search_path inseguro" : r.err.trim().split("\n").slice(0, 3).join(" | "),
        );
    });
}

async function dumpInventario(): Promise<void> {
    const sql = `
SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
       || ' | owner=' || pg_get_userbyid(p.proowner)
       || ' | secdef=' || p.prosecdef
       || ' | search_path=' || COALESCE(array_to_string(p.proconfig, ','), 'UNSET')
       || ' | acl=' || COALESCE(p.proacl::TEXT, 'DEFAULT(PUBLIC)')
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
 ORDER BY 1;`;
    const out = await scalar(sql);
    console.log("\n── INVENTÁRIO DE FUNÇÕES public ─────────────────────────────");
    console.log(out);

    const acl = await scalar(`
SELECT c.relname
       || ' | ' || COALESCE(c.relacl::TEXT, 'DEFAULT')
       || ' | rls=' || c.relrowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r'
 ORDER BY 1;`);
    console.log("\n── ACL DE TABELAS public ────────────────────────────────────");
    console.log(acl);
}

// ── Execução ────────────────────────────────────────────────────────────────
console.log(`\nREPLAY DE MIGRATIONS — modo=${modo} · alvo=container local descartável\n`);

const dv = await docker(["version", "--format", "{{.Server.Version}}"]);
if (dv.code !== 0) {
    console.error("❌ Docker não está disponível. Este gate exige Docker local.");
    console.error(dv.err.trim() || dv.out.trim());
    process.exit(1);
}
registrar(`docker disponível (engine ${dv.out.trim()})`, true);

try {
    await subirContainer();

    if (!(await aplicarArquivo("shim de plataforma Supabase", "supabase", "local", "00_platform_shim.sql"))) {
        throw new Error("shim falhou");
    }

    const todasOrdenadas = migrationsOrdenadas();
    const todas = linhagemDeProducao();
    const pacoteG1 = [...PACOTE_G1_V2];
    const pacoteAusente = pacoteG1.filter((nome) => !todasOrdenadas.includes(nome));
    const pacoteDuplicado = pacoteG1.filter((nome, indice) => pacoteG1.indexOf(nome) !== indice);
    const pacoteForaDaLinhagem = pacoteG1.filter((nome) => !todas.includes(nome));
    const pacoteValido = pacoteG1.length === 6
        && pacoteAusente.length === 0
        && pacoteDuplicado.length === 0
        && pacoteForaDaLinhagem.length === 0
        && !pacoteG1.includes(ORIGINAL_M6_HISTORICA as (typeof PACOTE_G1_V2)[number]);

    registrar(
        "custódia do pacote G1-v2 explícito (M1-M5+M6A, 6 arquivos únicos)",
        pacoteValido,
        pacoteValido
            ? undefined
            : `quantidade=${pacoteG1.length} · ausentes=${pacoteAusente.join(",") || "0"} · duplicados=${pacoteDuplicado.join(",") || "0"} · fora_da_linhagem=${pacoteForaDaLinhagem.join(",") || "0"}`,
    );
    if (!pacoteValido) throw new Error("custódia do pacote G1-v2 inválida");

    // ── Custódia do pacote Task 10.1 ────────────────────────────────────────
    const pacote10 = [...PACOTE_TASK_10_1];
    const p10Ausentes = pacote10.filter((nome) => !todasOrdenadas.includes(nome));
    const p10Duplicados = pacote10.filter((nome, i) => pacote10.indexOf(nome) !== i);
    const p10ForaDaLinhagem = pacote10.filter((nome) => !todas.includes(nome));
    const p10SobrepoeG1 = pacote10.filter((nome) => pacoteG1.includes(nome));
    const p10OrdemOk = [...pacote10].sort().join("|") === pacote10.join("|");
    const p10Valido =
        pacote10.length === 3 &&
        p10Ausentes.length === 0 &&
        p10Duplicados.length === 0 &&
        p10ForaDaLinhagem.length === 0 &&
        p10SobrepoeG1.length === 0 &&
        p10OrdemOk;

    registrar(
        "custódia do pacote Task 10.1 explícito (3 arquivos únicos, em ordem, sem sobreposição com G1-v2)",
        p10Valido,
        p10Valido
            ? undefined
            : `quantidade=${pacote10.length} · ausentes=${p10Ausentes.join(",") || "0"} · duplicados=${p10Duplicados.join(",") || "0"} · fora_da_linhagem=${p10ForaDaLinhagem.join(",") || "0"} · sobrepõe_G1=${p10SobrepoeG1.join(",") || "0"} · ordem_lexicográfica=${p10OrdemOk}`,
    );
    if (!p10Valido) throw new Error("custódia do pacote Task 10.1 inválida");

    // ── Custódia do pacote IVO R6 ───────────────────────────────────────────
    const pacoteR6 = [...PACOTE_IVO_R6];
    const r6Ausentes = pacoteR6.filter((nome) => !todasOrdenadas.includes(nome));
    const r6ForaDaLinhagem = pacoteR6.filter((nome) => !todas.includes(nome));
    const r6Sobrepoe = pacoteR6.filter(
        (nome) => pacoteG1.includes(nome as never) || pacote10.includes(nome as never),
    );
    const r6Valido =
        pacoteR6.length === 1 &&
        r6Ausentes.length === 0 &&
        r6ForaDaLinhagem.length === 0 &&
        r6Sobrepoe.length === 0;
    registrar(
        "custódia do pacote IVO R6 explícito (1 arquivo, sem sobreposição com G1-v2/Task 10.1)",
        r6Valido,
        r6Valido
            ? undefined
            : `ausentes=${r6Ausentes.join(",") || "0"} · fora_da_linhagem=${r6ForaDaLinhagem.join(",") || "0"} · sobrepõe=${r6Sobrepoe.join(",") || "0"}`,
    );
    if (!r6Valido) throw new Error("custódia do pacote IVO R6 inválida");
    // ── Custódia do pacote IVO C8 ───────────────────────────────────────────
    const pacoteC8 = [...PACOTE_IVO_C8];
    const c8Ausentes = pacoteC8.filter((nome) => !todasOrdenadas.includes(nome));
    const c8ForaDaLinhagem = pacoteC8.filter((nome) => !todas.includes(nome));
    const c8Sobrepoe = pacoteC8.filter(
        (nome) => pacoteG1.includes(nome as never) || pacote10.includes(nome as never) || pacoteR6.includes(nome as never),
    );
    const c8OrdemOk = pacoteR6.every((r6) => pacoteC8.every((c8) => r6 < c8));
    const c8Valido =
        pacoteC8.length === 1 &&
        c8Ausentes.length === 0 &&
        c8ForaDaLinhagem.length === 0 &&
        c8Sobrepoe.length === 0 &&
        c8OrdemOk;
    registrar(
        "custódia do pacote IVO C8 explícito (1 arquivo, depois do R6, sem sobreposição)",
        c8Valido,
        c8Valido
            ? undefined
            : `ausentes=${c8Ausentes.join(",") || "0"} · fora_da_linhagem=${c8ForaDaLinhagem.join(",") || "0"} · sobrepõe=${c8Sobrepoe.join(",") || "0"} · ordem_apos_R6=${c8OrdemOk}`,
    );
    if (!c8Valido) throw new Error("custódia do pacote IVO C8 inválida");

    // ── Custódia do pacote IVO PI-13 ────────────────────────────────────────
    const pacotePI13 = [...PACOTE_IVO_PI13];
    const pi13Ausentes = pacotePI13.filter((nome) => !todasOrdenadas.includes(nome));
    const pi13ForaDaLinhagem = pacotePI13.filter((nome) => !todas.includes(nome));
    const pi13Sobrepoe = pacotePI13.filter(
        (nome) =>
            pacoteG1.includes(nome as never) ||
            pacote10.includes(nome as never) ||
            pacoteR6.includes(nome as never) ||
            pacoteC8.includes(nome as never),
    );
    const pi13OrdemOk = pacoteC8.every((c8) => pacotePI13.every((pi13) => c8 < pi13));
    const pi13Valido =
        pacotePI13.length === 1 &&
        pi13Ausentes.length === 0 &&
        pi13ForaDaLinhagem.length === 0 &&
        pi13Sobrepoe.length === 0 &&
        pi13OrdemOk;
    registrar(
        "custódia do pacote IVO PI-13 explícito (1 arquivo aditivo, depois do C8, sem sobreposição)",
        pi13Valido,
        pi13Valido
            ? undefined
            : `ausentes=${pi13Ausentes.join(",") || "0"} · fora_da_linhagem=${pi13ForaDaLinhagem.join(",") || "0"} · sobrepõe=${pi13Sobrepoe.join(",") || "0"} · ordem_apos_C8=${pi13OrdemOk}`,
    );
    if (!pi13Valido) throw new Error("custódia do pacote IVO PI-13 inválida");

    // Reconciliação aritmética explícita: nenhum arquivo da linhagem de
    // produção fica sem classificação. Se alguém adicionar uma migration nova
    // sem decidir a que pacote ela pertence, este passo falha — em vez de o
    // preprod ficar silenciosamente incompleto, como aconteceu na 10.1.
    const antesPrevisto = todas.filter(
        (nome) => nome < G1_BOUNDARY || SUPERSEDIDAS_NAO_AUTORADAS.has(nome),
    );
    const classificadas = new Set<string>([
        ...antesPrevisto,
        ...pacoteG1,
        ...pacote10,
        ...pacoteR6,
        ...pacoteC8,
        ...pacotePI13,
        ORIGINAL_M6_HISTORICA,
    ]);
    const semClassificacao = todas.filter((nome) => !classificadas.has(nome));
    registrar(
        `reconciliação de arquivos (${todas.length} da linhagem = ${antesPrevisto.length} baseline + ${pacoteG1.length} G1-v2 + ${pacote10.length} Task 10.1 + ${pacoteR6.length} IVO R6 + ${pacoteC8.length} IVO C8 + ${pacotePI13.length} IVO PI-13 + 1 M6 histórico)`,
        semClassificacao.length === 0 && classificadas.size === todas.length,
        semClassificacao.length > 0
            ? `sem classificação: ${semClassificacao.join(", ")}`
            : `classificadas=${classificadas.size} vs linhagem=${todas.length}`,
    );
    if (semClassificacao.length > 0) throw new Error("migration sem pacote declarado");

    // Baseline preprod é deliberadamente assimétrico: tudo antes da fronteira
    // produtiva mais a correção parcial do Lovable, que pode já estar aplicada
    // apesar do timestamp posterior. O M6 histórico não entra no baseline nem
    // no pacote produtivo; ele permanece exercitado somente na cadeia clean/RC.
    const antes = todas.filter(
        (nome) => nome < G1_BOUNDARY || SUPERSEDIDAS_NAO_AUTORADAS.has(nome),
    );

    registrar(
        `linhagem de produção resolvida (${todas.length} de ${todasOrdenadas.length} migrations)`,
        true,
    );
    for (const n of STAGING_ONLY_MIGRATIONS) {
        console.log(`         fora — exclusiva de staging: ${n}`);
    }
    for (const [n, motivo] of NAO_EXECUTAVEIS) {
        console.log(`         fora — não executável: ${n}`);
        console.log(`                ${motivo}`);
    }

    if (modo === "clean") {
        if (!(await aplicarCadeia(todas, "cadeia completa RC aplicada (M6 histórico + M6A)"))) {
            throw new Error("cadeia falhou");
        }
    } else if (modo === "upgrade") {
        await rodarEnsaioDeAtualizacao(todas.filter((nome) => !pacote10.includes(nome)));
    } else {
        if (!(await aplicarCadeia(antes, "estado pré-produção reproduzido"))) {
            throw new Error("baseline falhou");
        }
        if (
            !(await aplicarArquivo(
                "drift de ACL observado em produção injetado",
                "supabase",
                "local",
                "10_production_observed_drift.sql",
            ))
        ) {
            throw new Error("drift falhou");
        }

        // A observação read-only de produção classificou M1 como já efetivo.
        // Aplicá-lo uma vez estabelece esse prestate no clone; reaplicá-lo logo
        // depois como primeiro item do pacote prova retomabilidade real.
        if (
            !(await aplicarCadeia(
                [PACOTE_G1_V2[0]],
                "prestate produtivo estabelecido (M1 já presente)",
            ))
        ) {
            throw new Error("prestate M1 falhou");
        }
        if (
            !(await aplicarArquivo(
                "superfície production-like sem 14 funções futuras",
                "supabase",
                "local",
                "20_production_absent_future_function_surface.sql",
            ))
        ) {
            throw new Error("fixture de superfície futura ausente falhou");
        }
        if (!(await aplicarCadeia(pacoteG1, "pacote G1-v2 explícito aplicado sobre o estado real"))) {
            throw new Error("pacote G1-v2 falhou");
        }

        // Correção do defeito D3: sem este passo, as suítes 03, 05 e 06 rodavam
        // contra um banco que não tem `cohort_capsules` nem a ACL de `waves`
        // fechada — três FAIL do harness, não das migrations.
        if (
            !(await aplicarCadeia(
                pacote10,
                "pacote Task 10.1 explícito aplicado sobre o estado real",
            ))
        ) {
            throw new Error("pacote Task 10.1 falhou");
        }

        // IVO R6 — pendente de revisão; sobre o estado produtivo observado só
        // adiciona colunas/constraints (create_action_plan não existe ali).
        if (
            !(await aplicarCadeia(
                pacoteR6,
                "pacote IVO R6 aplicado sobre o estado real (módulo Action Plan ausente)",
            ))
        ) {
            throw new Error("pacote IVO R6 falhou");
        }
        // IVO C8 — depende só da tabela action_items (presente no estado produtivo observado).
        if (
            !(await aplicarCadeia(
                pacoteC8,
                "pacote IVO C8 aplicado sobre o estado real (tabelas do ledger presentes, RPCs ausentes)",
            ))
        ) {
            throw new Error("pacote IVO C8 falhou");
        }
        const tabelasC8 = await scalar(
            "SELECT (to_regclass('public.efficacy_protocols') IS NOT NULL AND to_regclass('public.efficacy_observations') IS NOT NULL AND to_regclass('public.efficacy_verdicts') IS NOT NULL AND to_regprocedure('public.create_action_plan(uuid,text,text,uuid,uuid,jsonb)') IS NULL)::TEXT;",
        );
        registrar("C8 no baseline produtivo: tabelas de eficácia criadas sem depender das RPCs do ledger (ausentes)", tabelasC8 === "true", `tabelas presentes e RPC ausente=${tabelasC8}`);

        // O estado ANTERIOR ao PI-13 é preservado num clone para o ensaio de
        // atualização (dados do ledger criados pelas RPCs existentes, depois a
        // migration nova por cima).
        await docker(["exec", "-e", `PGPASSWORD=${PGPASSWORD}`, CONTAINER, "dropdb", "--if-exists", "--force", "-U", PGUSER, CLONE_PI13_ANTERIOR]);
        const clonePI13 = await docker([
            "exec", "-e", `PGPASSWORD=${PGPASSWORD}`, CONTAINER,
            "createdb", "-U", PGUSER, "-T", DB, CLONE_PI13_ANTERIOR,
        ]);
        registrar(
            "estado anterior ao PI-13 preservado em clone (para o ensaio de atualização)",
            clonePI13.code === 0,
            clonePI13.code === 0 ? undefined : clonePI13.err.trim() || clonePI13.out.trim(),
        );

        // IVO PI-13 — depende só das tabelas do ledger e das colunas do R6.
        if (
            !(await aplicarCadeia(
                pacotePI13,
                "pacote IVO PI-13 aplicado sobre o estado real (tabelas do ledger presentes, RPCs ausentes)",
            ))
        ) {
            throw new Error("pacote IVO PI-13 falhou");
        }
        const gatilhosPI13 = await scalar(
            "SELECT (to_regnamespace('ivo_ledger') IS NOT NULL AND (SELECT COUNT(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'ivo_ledger\\_%') = 6 AND to_regprocedure('public.create_action_plan(uuid,text,text,uuid,uuid,jsonb)') IS NULL)::TEXT;",
        );
        registrar("PI-13 no baseline produtivo: 6 gatilhos instalados sem depender das RPCs do ledger (ausentes)", gatilhosPI13 === "true", `gatilhos e RPC ausente=${gatilhosPI13}`);

        // O inventário produtivo é 0 respostas (3 ondas legadas seladas), então
        // o bootstrap tem de ser comprovadamente no-op AQUI — e não por
        // suposição: o estado é conferido no banco.
        const capsulasPreprod = await scalar(
            "SELECT COUNT(*)::TEXT FROM public.cohort_capsules;",
        );
        registrar(
            "bootstrap no-op no baseline produtivo (0 respostas ⇒ 0 baseline semeado)",
            capsulasPreprod === "0",
            `linhas em cohort_capsules = ${capsulasPreprod}`,
        );
    }

    // ── Retomabilidade do runbook G1 ────────────────────────────────────────
    //
    // Uma janela de mudança pode ser interrompida. O que o operador precisa
    // saber é o que acontece ao rodar o pacote de novo — e a resposta não é a
    // mesma para todas as migrations, então afirmar "o pacote é idempotente"
    // seria falso.
    //
    // Duas propriedades distintas, verificadas separadamente:
    //
    //   · as migrations desta onda são IDEMPOTENTES: reaplicar tem de passar,
    //     porque o operador pode não saber se a primeira execução completou;
    //   · as migrations pré-existentes do pacote são ONE-SHOT com detecção de
    //     drift, por decisão de quem as escreveu. Reaplicar tem de RECUSAR, com
    //     diagnóstico. Uma recusa aqui é o comportamento correto; o que seria
    //     defeito é reaplicar em silêncio.
    for (const nome of pacoteG1.filter((n) => IDEMPOTENTES.has(n))) {
        const r = await psql(lerSql("supabase", "migrations", nome));
        registrar(
            `idempotente ao reaplicar: ${nome}`,
            r.code === 0,
            r.code === 0 ? undefined : r.err.trim().split("\n").slice(0, 4).join(" | "),
        );
    }
    for (const nome of pacoteR6) {
        const r = await psql(lerSql("supabase", "migrations", nome));
        registrar(
            `idempotente ao reaplicar: ${nome}`,
            r.code === 0,
            r.code === 0 ? undefined : r.err.trim().split("\n").slice(0, 4).join(" | "),
        );
    }
    for (const nome of pacoteC8) {
        const r = await psql(lerSql("supabase", "migrations", nome));
        registrar(
            `idempotente ao reaplicar: ${nome}`,
            r.code === 0,
            r.code === 0 ? undefined : r.err.trim().split("\n").slice(0, 4).join(" | "),
        );
    }
    for (const nome of pacotePI13) {
        const r = await psql(lerSql("supabase", "migrations", nome));
        registrar(
            `idempotente ao reaplicar: ${nome}`,
            r.code === 0,
            r.code === 0 ? undefined : r.err.trim().split("\n").slice(0, 4).join(" | "),
        );
    }
    await caracterizarAtualizacaoR6(pacoteR6);

    // 20260825022411 já foi aplicada dentro de `antes` (linhagem de
    // baseline), nunca dentro do pacote G1-v2 explícito. Aqui só se VERIFICA a
    // se VERIFICA a supersessão, sem reaplicar o arquivo, que é justamente o
    // que não é seguro (ver SUPERSEDIDAS_NAO_AUTORADAS acima).
    if (SUPERSEDIDAS_NAO_AUTORADAS.size > 0) {
        const r = await scalar(`
      SELECT
        (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND tablename='profiles')::TEXT
        || '|' ||
        (to_regprocedure('public.prevent_profile_privilege_escalation()') IS NULL)::TEXT
        || '|' ||
        (SELECT COUNT(*) FROM pg_trigger
          WHERE tgrelid='public.profiles'::regclass AND NOT tgisinternal
            AND tgname <> 'profiles_authority_boundary')::TEXT;
    `);
        const [policiesTotal, funcaoAusente, triggersExtra] = r.split("|");
        // Cast de BOOLEAN para TEXT no Postgres produz 'true'/'false' — é a
        // saída de -tAq aqui, diferente do 't'/'f' que só existe na
        // formatação de tupla do próprio psql para coluna boolean direta.
        const ok = policiesTotal === "2" && funcaoAusente === "true" && triggersExtra === "0";
        registrar(
            "supersessão de 20260825022411 confirmada após a cadeia completa",
            ok,
            ok
                ? undefined
                : `policies=${policiesTotal} (esperado 2) · prevent_profile_privilege_escalation ausente=${funcaoAusente} (esperado true) · triggers extras=${triggersExtra} (esperado 0)`,
        );
    }

    await rodarProvas();
    if (modo === "preprod") await provarPromocaoActionPlan(pacoteR6, pacoteC8, pacotePI13);
    if (modo === "preprod") await provarAtualizacaoPI13(pacoteR6, pacoteC8, pacotePI13);
    await rodarMatrizNegativaM6A();

    // Deixado para o fim: uma migration one-shot que recusa aborta a própria
    // transação, mas rodar isso antes das provas seria arriscar o estado do
    // banco de prova por um teste que não precisa dessa ordem.
    for (const nome of pacoteG1.filter((n) => !IDEMPOTENTES.has(n))) {
        const r = await psql(lerSql("supabase", "migrations", nome));
        registrar(
            `one-shot recusa reaplicação (fail-closed): ${nome}`,
            r.code !== 0,
            r.code !== 0 ? undefined : "reaplicou em silêncio — deveria detectar drift e abortar",
        );
    }

    // ── Reaplicação da Task 10.1 — sempre no FIM, nunca antes das provas ────
    await caracterizarReaplicacaoTask10();

    if (inventario) await dumpInventario();
} catch (e) {
    console.error(`\n(interrompido: ${(e as Error).message})`);
} finally {
    if (!manter) {
        await docker(["rm", "-f", CONTAINER]);
    } else {
        console.log(`\nContainer mantido: docker exec -it ${CONTAINER} psql -U ${PGUSER} -d ${DB}`);
    }
}

const okCount = passos.filter((p) => p.ok).length;
console.log(`\n── RESULTADO ─────────────────────────────────────────────────`);
console.log(`modo=${modo} · passos=${passos.length} · ok=${okCount} · falhas=${passos.length - okCount}`);

if (falhou) {
    console.error("\n❌ REPLAY FALHOU — ver passos marcados FAIL acima.");
    process.exit(1);
}
console.log("\n✅ REPLAY OK — cadeia aplica e todas as invariantes foram provadas no banco.");
process.exit(0);
