# Contributing

Pré-código (v0.2.x → v0.3): contribuições via co-design com associações seed.

## Canais

- Aplicar como piloto: https://canna-br.fonsecagabriel.com.br/open/seed-associations/
- Issues: bugs do site, gaps de docs, propostas regulatórias
- Discussions: arquitetura, ADRs, integrações MCP

## Código

Repo dedicado terá CI completo + ARCHITECTURE.md detalhado a partir de v0.3 (jul/2026). Até lá, alterações são feitas no vault privado do mantenedor.

## apply-worker setup

`wrangler.toml` is gitignored (contains account_id + email). Copy from template and set secrets:

```bash
cp apps/apply-worker/wrangler.toml.example apps/apply-worker/wrangler.toml
# edit account_id + email vars in wrangler.toml
wrangler secret put SENDKIT_API_KEY
wrangler secret put ADMIN_KEY
```
