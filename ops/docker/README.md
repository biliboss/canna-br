# Suba a sua instância — canna-br v0.1.0 self-host

O caminho OSS de self-host: uma associação roda a própria instância com
`docker compose up`, sem depender de nenhum SaaS externo.

## TL;DR

```bash
cp .env.example .env          # preencha POSTGRES_PASSWORD, ZITADEL_MASTERKEY, OPENROUTER_API_KEY
docker compose up             # builda a imagem única uma vez e sobe todos os roles
```

Tudo roda a partir de **uma imagem OCI** (`canna-br:0.1.0`, root `Dockerfile`).
Cada serviço escolhe seu papel via override de `CMD` — padrão "1 imagem, CMD por
role".

## O que roda onde

| Serviço    | Porta (host) | Papel |
|------------|--------------|-------|
| `postgres` | 5432         | Event store (Emmett) + read models (Drizzle). Volume `canna-postgres-data`. |
| `redis`    | 6379         | Filas BullMQ do worker. Volume `canna-redis-data`. |
| `zitadel`  | 8080         | Auth / multi-tenant (instância única self-host). |
| `api`      | 3000         | REST Fastify (`POST /v1/commands/*`, `GET /health`). |
| `mcp`      | 3001         | Servidor MCP (StreamableHTTP, headers `x-canna-*`). |
| `worker`   | — (interno)  | Worker BullMQ (SNGPC / PDF / e-mail). Health interno em 3002. |
| `agent`    | 3002         | Chat Next.js / assistant-ui. **Opt-in** — ver abaixo. |

`api`, `mcp` e `worker` saem da mesma imagem com `command:` diferente.
`postgres`, `redis` e `zitadel` usam imagens oficiais.

Primeiro boot do Zitadel imprime o admin inicial:

```bash
docker compose logs zitadel | grep -i "admin"
```

## Managed vs self-host

- **Managed** (preferência do owner): Zitadel **Cloud** + Postgres **Neon**. As
  apps apontam `DATABASE_URL` para o Neon e usam o IdP do Zitadel Cloud — não
  sobe `postgres`/`zitadel` localmente.
- **Self-host** (este compose): tudo nos serviços acima, zero SaaS. É o caminho
  OSS para uma associação rodar sozinha.

Para usar Postgres gerenciado mantendo o resto local, defina `DATABASE_URL` no
`.env` apontando para o host externo.

## O serviço `agent` (chat) — opt-in

O `apps/agent` **não** é buildado pela imagem raiz: ele está fora do workspace
pnpm e depende de pacotes `link:` (assistant-ui) que vivem **fora deste repo**
(`~/.obsidian/.../mcp-app-base/packages/*`). Um `docker build` limpo não resolve
essas dependências.

Por isso ele fica atrás de um profile e exige imagem própria:

```bash
# builde a imagem do agent a partir do boilerplate (fora deste fluxo) e taggee
# canna-br-agent:0.1.0, então:
docker compose --profile agent up
```

**TODO (v0.1.x):** publicar / vendorizar os pacotes assistant-ui, adicionar um
build stage do agent ao `Dockerfile`, apontar `image:` para ele e remover o
`profiles`.

## TODOs conhecidos (profundidade do Zitadel)

- O Zitadel **sobe e inicializa** (banco próprio `zitadel` no mesmo Postgres),
  mas as apps `api`/`mcp` ainda leem **headers stub `x-canna-*`** (v0.2.1) e
  **não validam** tokens do Zitadel. O wiring OAuth 2.1 (Zitadel como IdP) é
  follow-up de v0.1.x.
- `ZITADEL_EXTERNALSECURE=false` e `--tlsMode disabled` são **dev-only**. Antes
  de expor publicamente: TLS via reverse proxy + `ZITADEL_EXTERNALSECURE=true`.
- `ZITADEL_MASTERKEY` precisa ter **exatamente 32 bytes**.

## Verificar

```bash
docker compose config       # valida + resolve o compose
curl localhost:3000/health  # api
curl localhost:3001/health  # mcp
```
