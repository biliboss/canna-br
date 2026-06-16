# Contributing

Pré-código (v0.2.x → v0.3): contribuições via co-design com associações seed.

## Canais

- Aplicar como piloto: https://cannabr.org/open/seed-associations/
- Issues: bugs do site, gaps de docs, propostas regulatórias
- Discussions: arquitetura, ADRs, integrações MCP

## Código

Repo dedicado terá CI completo + ARCHITECTURE.md detalhado a partir de v0.3 (jul/2026). Até lá, alterações são feitas no vault privado do mantenedor.

## CLA & Dual Licensing

> ⚠️ Sujeito a revisão jurídica antes de vigorar.

Ao submeter uma contribuição (pull request, patch ou commit), o contribuidor concorda com o **Contributor License Agreement (CLA)** do projeto:

- O contribuidor **mantém os seus direitos autorais**.
- O contribuidor **concede ao mantenedor (Gabriel Fonseca) licença perpétua, irrevogável e mundial** para sublicenciar o trabalho sob qualquer licença, incluindo licenças comerciais.

### Por que o CLA é necessário

O canna-br opera um modelo **dual-license**:

| Uso | Licença |
|---|---|
| Self-host, uso interno, fork AGPL-compliant, contribuições | AGPL-3.0 (gratuita) |
| Embeber em produto comercial, oferecer como serviço gerenciado a terceiros, integração com certeza jurídica de obra derivada | Licença Comercial (ver [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md)) |

O CLA é o instrumento jurídico que permite ao mantenedor oferecer a licença comercial para esses casos específicos **sem alterar a licença pública AGPL-3.0**. Sem CLA, qualquer contribuição recebida bloquearia legalmente o dual-licensing.

### Processo (interim até v0.3)

Antes de v0.3 (jul/2026), o repo é privado e contribuições são feitas via co-design direto com o mantenedor. O aceite explícito de um pull request pelo mantenedor equivale ao aceite do CLA descrito acima. Um mecanismo automatizado (CLA-bot ou assinatura eletrônica) será implementado junto ao CI em v0.3.

---

## apply-worker setup

`wrangler.toml` is gitignored (contains account_id + email). Copy from template and set secrets:

```bash
cp apps/apply-worker/wrangler.toml.example apps/apply-worker/wrangler.toml
# edit account_id + email vars in wrangler.toml
wrangler secret put SENDKIT_API_KEY
wrangler secret put ADMIN_KEY
```
