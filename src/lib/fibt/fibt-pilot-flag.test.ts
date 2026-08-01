// Feature gate do piloto FIB-T: os 7 comportamentos exigidos.
//
// O ponto crítico não é "o flag liga e desliga" — é que, DESLIGADO, nenhuma
// chamada ao Supabase sai e nenhum mock aparece no lugar. Um gate que só
// esconde a UI mas deixa a chamada acontecer não protege o banco produtivo,
// que é a razão de o gate existir.

import { afterEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FIBT_PILOT_DISABLED_REASON, isFibtPilotEnabled } from "./fibt-pilot-flag";

describe("leitura do flag — fail-closed", () => {
  test("1. ausente → desabilitado", () => {
    expect(isFibtPilotEnabled({})).toBe(false);
    expect(isFibtPilotEnabled({ VITE_FIBT_PILOT_ENABLED: undefined })).toBe(false);
  });

  test("2. \"false\" → desabilitado", () => {
    expect(isFibtPilotEnabled({ VITE_FIBT_PILOT_ENABLED: "false" })).toBe(false);
  });

  test("3. \"true\" → habilitado", () => {
    expect(isFibtPilotEnabled({ VITE_FIBT_PILOT_ENABLED: "true" })).toBe(true);
    expect(isFibtPilotEnabled({ VITE_FIBT_PILOT_ENABLED: " TRUE " })).toBe(true);
  });

  test("nenhuma variação conveniente liga o piloto por acidente", () => {
    for (const v of ["1", "yes", "on", "sim", "", "  ", "truthy", "TRUE!"]) {
      expect({ v, ligado: isFibtPilotEnabled({ VITE_FIBT_PILOT_ENABLED: v }) }).toEqual({
        v,
        ligado: false,
      });
    }
  });
});

describe("camada de dados com o piloto desligado", () => {
  afterEach(() => {
    mock.restore();
  });

  /**
   * Carrega a camada de dados com o cliente Supabase substituído por um espião
   * que EXPLODE se for tocado. Assim o teste não verifica "não deu erro" — ele
   * verifica que a rede nunca foi alcançada.
   */
  async function comSupabaseProibido(flag: string | undefined) {
    const toques: string[] = [];
    const proibir = (op: string) => () => {
      toques.push(op);
      throw new Error(`chamada proibida ao Supabase: ${op}`);
    };

    mock.module("@/integrations/supabase/client", () => ({
      supabase: { from: proibir("from"), rpc: proibir("rpc") },
    }));
    mock.module("@/lib/cloud/supabase-client", () => ({
      isCloudReady: () => true, // backend "pronto": o único bloqueio é o gate
      getSupabaseClient: () => ({}),
    }));
    mock.module("@/lib/fibt/fibt-pilot-flag", () => ({
      isFibtPilotEnabled: () => flag === "true",
      FIBT_PILOT_DISABLED_REASON,
    }));

    const mod = await import("@/lib/api/fibt-cohort.functions?flag=" + String(flag));
    return { mod, toques };
  }

  test("4. desabilitado não chama aggregate_cohort_responses", async () => {
    const { mod, toques } = await comSupabaseProibido(undefined);
    const r = await mod.loadFibtCohortReport("onda-1", "coorte-1");
    expect(r.estado).toBe("indisponivel");
    expect(toques).toEqual([]);
  });

  test("5. desabilitado não consulta a tabela wave_cohorts", async () => {
    const { mod, toques } = await comSupabaseProibido(undefined);
    const r = await mod.loadWaveCohorts("onda-1");
    expect(r.estado).toBe("indisponivel");
    expect(toques).toEqual([]);
  });

  test("6. o motivo devolvido é o do gate, e não um agregado fictício", async () => {
    const { mod } = await comSupabaseProibido("false");
    const r = await mod.loadWaveCohorts("onda-1");
    expect(r.estado).toBe("indisponivel");
    if (r.estado === "indisponivel") {
      expect(r.motivo).toBe(FIBT_PILOT_DISABLED_REASON);
      expect(r.motivo).toContain("nenhum dado de demonstração");
    }
    expect(r).not.toHaveProperty("coortes");
  });

  test("habilitado volta a alcançar o cliente (o gate é a única barreira)", async () => {
    const { mod } = await comSupabaseProibido("true");

    // Com o piloto ligado, o gate deixa passar e o caminho segue para o
    // cliente — que aqui é um espião. O que importa provar é a ausência do
    // bloqueio, não qual erro o espião produz: afirmar a mensagem exata
    // acoplaria o teste ao mock de outro arquivo, e essa interferência entre
    // arquivos já causou um incidente real nesta base (ver gate.yml).
    let bloqueado = false;
    try {
      const r = await mod.loadWaveCohorts("onda-1");
      bloqueado = r.estado === "indisponivel" && r.motivo === FIBT_PILOT_DISABLED_REASON;
    } catch {
      bloqueado = false; // chegou ao cliente e falhou lá: o gate abriu
    }
    expect(bloqueado).toBe(false);
  });
});

describe("superfície da rota", () => {
  const raiz = process.cwd();
  const rota = () => readFileSync(join(raiz, "src/routes/fibt-piloto.tsx"), "utf8");

  test("7. a rota não aparece em nenhuma navegação do app", () => {
    // Alcançável só por URL direta — e, desabilitada, mostra estado
    // controlado. Se um dia alguém a adicionar ao pack de navegação ou ao
    // AppShell, este teste falha e a decisão vira explícita.
    const nav = readFileSync(join(raiz, "src/app/shell/AppShell.tsx"), "utf8");
    expect(nav).not.toContain("fibt-piloto");

    const packs = ["src/domain/packs/enterprise/enterprise.pack.json"];
    for (const p of packs) {
      expect(readFileSync(join(raiz, p), "utf8")).not.toContain("fibt-piloto");
    }
  });

  test("a rota consulta o gate antes de qualquer carga", () => {
    const src = rota();
    expect(src).toContain("isFibtPilotEnabled");
    expect(src).toContain("EstadoDesabilitado");
    // O efeito de ?wave= tem que respeitar o gate, senão acesso direto
    // com parametro viraria contorno.
    expect(src).toMatch(/if \(!habilitado\) return;/);
  });

  test("a rota continua sem qualquer import de mock", () => {
    expect(rota()).not.toMatch(/from\s+["']@\/mocks/);
  });
});
