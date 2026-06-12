import { createContext, useContext, type ReactNode } from "react";

/**
 * MockDataProvider — stub vazio.
 * Será preenchido nos blocos seguintes com fixtures de demonstração.
 */

interface MockDataContextValue {
  enabled: boolean;
}

const MockDataContext = createContext<MockDataContextValue>({ enabled: false });

export function MockDataProvider({ children }: { children: ReactNode }) {
  return (
    <MockDataContext.Provider value={{ enabled: false }}>{children}</MockDataContext.Provider>
  );
}

export function useMockData() {
  return useContext(MockDataContext);
}
