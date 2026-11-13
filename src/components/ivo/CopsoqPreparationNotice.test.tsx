import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen, within } from "@testing-library/react";
import { getCopsoqManifest } from "@/domain/survey/copsoq-instrument-manifest";
import { CopsoqPreparationNotice } from "./CopsoqPreparationNotice";
afterEach(cleanup);
test("Q1 expõe a versão realmente servida, pré-requisito e continuidade independente de Q2", () => {
  render(<CopsoqPreparationNotice />);
  const panel = screen.getByRole("region", { name: "Q1 · COPSOQ — preparação da aplicação" });
  expect(within(panel).getByText(getCopsoqManifest().version)).toBeTruthy();
  expect(within(panel).getByText(getCopsoqManifest().served_name)).toBeTruthy();
  expect(within(panel).getByRole("note").textContent).toContain("independentemente de Q1");
  expect(within(panel).getByRole("note").textContent).toContain("permanecem indisponíveis");
  expect(within(panel).queryAllByRole("button")).toHaveLength(0);
  expect(within(panel).getByRole("link").getAttribute("href")).toBe("/ivo-integral/governanca");
});
