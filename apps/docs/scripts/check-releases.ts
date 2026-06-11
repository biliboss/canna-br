/**
 * check-releases.ts
 *
 * Verifica que cada releases[].docsSlug em public/releases.json
 * mapeia para um arquivo existente em src/content/docs/releases/.
 *
 * Uso:
 *   bun scripts/check-releases.ts
 *
 * Sai com código 1 se algum slug não tiver arquivo correspondente.
 *
 * Mapeamento:
 *   docsSlug "/releases/v0-1-0-coordenacao-metricas/"
 *     → src/content/docs/releases/v0-1-0-coordenacao-metricas.{md,mdx,astro}
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

const releasesJsonPath = join(ROOT, "public", "releases.json");
const contentBase = join(ROOT, "src", "content", "docs", "releases");

/* ── load releases.json ── */
let data: {
  releases?: { version: string; docsSlug?: string | null }[];
};
try {
  data = JSON.parse(readFileSync(releasesJsonPath, "utf-8"));
} catch (err) {
  console.error(`[check-releases] Falha ao ler ${releasesJsonPath}:`, err);
  process.exit(1);
}

const releases = data.releases ?? [];
const EXTS = [".md", ".mdx", ".astro"];

let failed = false;

for (const rel of releases) {
  const slug = rel.docsSlug;
  if (!slug) continue; // slug nulo/ausente é permitido (release sem página ainda)

  /* normaliza: "/releases/v0-1-0-.../" → "v0-1-0-..." */
  const parts = slug.replace(/^\/releases\//, "").replace(/\/$/, "");
  if (!parts) {
    console.warn(
      `[check-releases] WARN ${rel.version}: docsSlug "${slug}" resultou em slug vazio após normalização`
    );
    continue;
  }

  const found = EXTS.some((ext) => existsSync(join(contentBase, parts + ext)));
  if (found) {
    console.log(`[check-releases] OK  ${rel.version}: ${slug}`);
  } else {
    const tried = EXTS.map((ext) => join(contentBase, parts + ext)).join(", ");
    console.error(
      `[check-releases] FAIL ${rel.version}: docsSlug "${slug}" → nenhum arquivo encontrado.\n  Tentativas: ${tried}`
    );
    failed = true;
  }
}

if (releases.filter((r) => r.docsSlug).length === 0) {
  console.log("[check-releases] Nenhum docsSlug para verificar.");
}

if (failed) {
  console.error("\n[check-releases] Uma ou mais slugs não têm arquivo correspondente. Crie a página ou corrija o docsSlug.");
  process.exit(1);
} else {
  console.log("\n[check-releases] Tudo certo — todas as slugs têm arquivo correspondente.");
  process.exit(0);
}
