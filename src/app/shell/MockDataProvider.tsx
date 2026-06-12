import { createContext, useContext, type ReactNode } from "react";

/**
 * MockDataProvider — camada mock ativa (Bloco 2).
 * Os hooks tipados vivem em src/mocks/hooks.ts (useOrg, useIvo,
 * useTeamIvo, useSeason). Fase 2 troca a implementação dos hooks por
 * chamadas reais sem tocar nas telas.
 */

interface MockDataContextValue {
  enabled: boolean;
}

const MockDataContext = createContext<MockDataContextValue>({ enabled: true });

export function MockDataProvider({ children }: { children: ReactNode }) {
  return <MockDataContext.Provider value={{ enabled: true }}>{children}</MockDataContext.Provider>;
}

export function useMockData() {
  return useContext(MockDataContext);
}
