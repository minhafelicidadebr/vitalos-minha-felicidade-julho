// Fundação de testes de componente React — registra o DOM simulado do
// happy-dom globalmente (window/document/APIs DOM) e limpa a árvore
// renderizada entre cada teste. Preload único via bunfig.toml [test];
// nenhum teste precisa importar isto diretamente.
//
// Import dinâmico da Testing Library é proposital: o `screen` de
// @testing-library/dom captura `document` uma única vez, na avaliação do
// módulo — um import estático no topo deste arquivo seria resolvido antes
// de GlobalRegistrator.register() rodar (imports sempre avaliam antes do
// código de topo do módulo, independente da ordem textual), quebrando
// screen.getByRole/queryByRole em todo teste.

import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach } from "bun:test";

GlobalRegistrator.register();

const { cleanup } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});
