declare module "#tanstack-start-server-fn-resolver" {
  export function getServerFnById(
    id: string,
    access: { origin: "client" } | { origin: "server" },
  ): Promise<unknown>;
}
