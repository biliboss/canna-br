/**
 * canna-api entrypoint — Fastify HTTP listener.
 *
 * v0.2.1.1 thin executable that wraps `createCannaApi()` factory into a
 * long-running process bound to a TCP port. Reads connection string + port
 * from env; expects `DATABASE_URL` + optional `PORT` / `HOST` / `LOG_LEVEL` /
 * `CORS_ORIGIN`.
 *
 * Health endpoint: GET /health (registered by createCannaApi).
 */
import { createPostgresEventStore } from "@canna/event-store";
import { createCannaApi } from "./app.js";

const env = (k: string): string | undefined => process.env[k];

const main = async (): Promise<void> => {
  const databaseUrl = env("DATABASE_URL");
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    process.stderr.write("FATAL: DATABASE_URL not set\n");
    process.exit(1);
  }

  const port = Number(env("PORT") ?? "3000");
  const host = env("HOST") ?? "0.0.0.0";
  const logLevel = env("LOG_LEVEL") ?? "info";
  const corsRaw = env("CORS_ORIGIN");
  const corsOrigin: string | string[] | boolean =
    corsRaw === undefined || corsRaw.length === 0
      ? false
      : corsRaw.includes(",")
        ? corsRaw.split(",").map((s) => s.trim())
        : corsRaw;

  const store = createPostgresEventStore({ connectionString: databaseUrl });

  const app = await createCannaApi({
    store,
    now: () => new Date(),
    logger: { level: logLevel },
    corsOrigin,
  });

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, "canna-api shutdown");
    try {
      await app.close();
    } catch (e) {
      app.log.error({ err: e }, "shutdown error");
    }
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port, host });
  app.log.info({ port, host }, "canna-api listening");
};

main().catch((err) => {
  process.stderr.write(`canna-api boot failed: ${String(err)}\n`);
  if (err instanceof Error && err.stack !== undefined) {
    process.stderr.write(`${err.stack}\n`);
  }
  process.exit(1);
});
