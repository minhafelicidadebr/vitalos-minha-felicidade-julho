import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { ENTERPRISE_GUIDE as G } from "@/domain/guide/enterprise-guide";
import { perspectiveForRole } from "@/domain/guide/guide-role";
import { Q2_ORIENTATION } from "@/domain/guide/q2-orientation";
import type { GuidePerspective } from "@/domain/guide/guide-types";
import { Q2Orientation } from "./Q2Orientation";

const ROLES: Record<GuidePerspective, string> = {
  rh: "RH_ADMIN",
  lideranca: "LIDER_EQUIPE",
  colaborador: "COLABORADOR",
  sst: "SST_PROFISSIONAL",
  direcao: "DIRETOR",
  plataforma: "PLATFORM_ADMIN",
};
const lens = G.lenses.find((l) => l.lens === "Q2")!;

describe("Orientação Q2 nas telas Leitura e Ações", () => {
  test("o recorte client-safe é idêntico ao guia (sem divergência de texto)", () => {
    for (const p of Object.keys(ROLES) as GuidePerspective[]) {
      const c = lens.matrix[p];
      expect(Q2_ORIENTATION.perspectives[p], p).toEqual({ voice: lens.voices[p] ?? null, mode: c.mode, who: c.who, receives: c.receives, ...(c.labels ? { labels: c.labels } : {}) });
    }
    expect(Q2_ORIENTATION.steps).toEqual(lens.scene.map((s) => ({ label: s.label, who: s.who })));
    expect(Q2_ORIENTATION.evidence).toBe(lens.journey!.evidence);
  });

  test("seis perfis: voz do guia visível, parte e destino vindos da matriz, recolhida por padrão", () => {
    for (const [perspective, role] of Object.entries(ROLES) as [GuidePerspective, string][]) {
      expect(perspectiveForRole(role), role).toBe(perspective);
      const { container, unmount } = render(<Q2Orientation roleId={role} stage="leitura" />);
      const details = container.querySelector("details")!;
      expect(details.hasAttribute("open"), perspective).toBe(false);
      expect(container.textContent, perspective).toContain(lens.voices[perspective] ?? "");
      expect(container.textContent, perspective).toContain(lens.matrix[perspective].who);
      expect(container.textContent, perspective).toContain(lens.matrix[perspective].receives);
      unmount();
    }
  });

  test("sem sessão: mostra o percurso e pede entrada, sem inventar a parte de um perfil", () => {
    const { container } = render(<Q2Orientation roleId={null} stage="acoes" />);
    expect(container.textContent).toContain("Entre com sua conta");
    expect(container.textContent).not.toContain(lens.matrix.rh.who);
    expect(container.querySelectorAll("ol li").length).toBe(lens.scene.length);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/guia-empresarial?etapa=Q2");
  });

  test("papel desconhecido cai no perfil de menor alcance (colaborador)", () => {
    expect(perspectiveForRole("QUALQUER")).toBe("colaborador");
    expect(perspectiveForRole(null)).toBe("colaborador");
    const { container } = render(<Q2Orientation roleId="QUALQUER" stage="leitura" />);
    expect(container.textContent).toContain(lens.matrix.colaborador.receives);
  });

  test("a etapa da tela marca os passos correspondentes com aria-current", () => {
    const leitura = render(<Q2Orientation roleId="RH_ADMIN" stage="leitura" />);
    expect([...leitura.container.querySelectorAll('li[aria-current="step"]')].length).toBe(2);
    leitura.unmount();
    const acoes = render(<Q2Orientation roleId="RH_ADMIN" stage="acoes" />);
    expect([...acoes.container.querySelectorAll('li[aria-current="step"]')].length).toBe(3);
  });

  test("link do guia leva o perfil; texto da evidência não promete efeito", () => {
    const { container } = render(<Q2Orientation roleId="LIDER_EQUIPE" stage="acoes" />);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/guia-empresarial?etapa=Q2&perfil=lideranca");
    expect(container.textContent).toContain("A melhora ainda não foi avaliada");
  });
});
