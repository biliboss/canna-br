import type { FastifyInstance } from "fastify";
import type { CannaApiDeps } from "../app.js";

const PKG_VERSION = "0.2.1";

export const registerHealthRoutes = async (
  app: FastifyInstance,
  _deps: CannaApiDeps,
): Promise<void> => {
  const bootedAt = Date.now();
  app.get("/health", async () => ({
    ok: true,
    version: PKG_VERSION,
    uptimeMs: Date.now() - bootedAt,
  }));
};
