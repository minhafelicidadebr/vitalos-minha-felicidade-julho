import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { ENTERPRISE_GUIDE as G } from "@/domain/guide/enterprise-guide";
import { perspectiveForRole } from "@/domain/guide/guide-role";
import { Q2_ORIENTATION } from "@/domain/guide/q2-orientation";
import type { GuidePerspective } from "@/domain/guide/guide-types";
import { Q2JourneyOrientation } from "./Q2JourneyOrientation";

const ROLES: Record<GuidePerspective, string> = {
  rh: "RH_ADMIN",
  lideranca: "LIDER_EQUIPE",
  colaborador: "COLABORADOR",
  sst: "SST_PROFISSIONAL",
  direcao: "DIRETOR",
  plataforma: "PLATFORM_ADMIN",
};
const lens = G.lenses.find((l) => l.lens === "Q2")!;

describe("Orientação Q2 · parte do perfil", () => {
  test("o recorte client-safe é idêntico ao guia (o guia segue só no servidor)", () => {
    for (const p of Object.keys(ROLES) as GuidePerspective[]) {
      const c = lens.matrix[p];
      expect(Q2_ORIENTATION.perspectives[p], p).toEqual({ voice: lens.voices[p] ?? null, mode: c.mode, who: c.who, receives: c.receives, ...(c.labels ? { labels: c.labels } : {}) });
    }
    expect(Q2_ORIENTATION.steps).toEqual(lens.scene.map((s) => ({ label: s.label, who: s.who })));
    expect(Q2_ORIENTATION.evidence).toBe(lens.journey!.evidence);
  });

  test("seis perfis: mostra a parte e o destino do perfil, com link do guia levando o perfil", () => {
    for (const [perspective, role] of Object.entries(ROLES) as [GuidePerspective, string][]) {
      expect(perspectiveForRole(role), role).toBe(perspective);
      const { container, unmount } = render(<Q2JourneyOrientation roleId={role} />);
      const box = container.querySelector('[data-testid="q2-orientation-profile"]')!;
      expect(box.textContent, perspective).toContain(lens.matrix[perspective].who);
      expect(box.textContent, perspective).toContain(lens.matrix[perspective].receives);
      expect(container.querySelector("a")?.getAttribute("href"), perspective).toBe(`/ivo-integral/guia?etapa=Q2&perfil=${perspective}`);
      unmount();
    }
  });

  test("sem sessão: conteúdo geral do Codex intacto, sem a parte de um perfil e link sem perfil", () => {
    const { container } = render(<Q2JourneyOrientation />);
    expect(container.querySelector('[data-testid="q2-orientation-profile"]')).toBeNull();
    expect(container.textContent).toContain("Como a leitura vira uma ação?");
    expect(container.querySelectorAll("ol li").length).toBe(3);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/ivo-integral/guia?etapa=Q2");
  });

  test("papel desconhecido cai no perfil de menor alcance (colaborador)", () => {
    expect(perspectiveForRole("QUALQUER")).toBe("colaborador");
    const { container } = render(<Q2JourneyOrientation roleId="QUALQUER" />);
    expect(container.querySelector('[data-testid="q2-orientation-profile"]')!.textContent).toContain(lens.matrix.colaborador.receives);
  });
});
