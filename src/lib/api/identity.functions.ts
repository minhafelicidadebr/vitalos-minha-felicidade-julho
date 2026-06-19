import { createServerFn } from "@tanstack/react-start";
import { readIdentityBoundaryStatus } from "../identity/identity-boundary.server";

export const getIdentityBoundaryStatus = createServerFn({ method: "GET" }).handler(async () =>
  readIdentityBoundaryStatus(),
);
