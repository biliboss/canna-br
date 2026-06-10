import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  server: {
    port: 4335,
    host: '127.0.0.1',
  },
  integrations: [
    starlight({
      title: 'canna-oss',
      description: 'OSS cannabis association management system — RDC 1.014 sandbox BR',
      defaultLocale: 'root',
      locales: {
        root: { label: 'Português', lang: 'pt-BR' },
      },
      sidebar: [
        { label: 'Visão Geral', link: '/' },
        {
          label: 'Domain Model',
          items: [
            { label: 'Event Storming', link: '/domain/event-storming/' },
            { label: 'Bounded Contexts', link: '/domain/bounded-contexts/' },
            { label: 'Domain Events', link: '/domain/domain-events/' },
            { label: 'Invariantes', link: '/domain/invariants/' },
          ],
        },
        {
          label: 'Research',
          items: [
            { label: 'Marco Legal BR', link: '/research/legal-framework/' },
            { label: 'ANVISA Sandbox', link: '/research/anvisa-sandbox/' },
            { label: 'ANVISA Validation Pathway', link: '/research/anvisa-validation-pathway/' },
            { label: 'SNGPC Integration', link: '/research/sngpc/' },
            { label: 'Software Landscape', link: '/research/software-landscape/' },
            { label: 'Modelos Internacionais', link: '/research/international-models/' },
            { label: 'Mercado Brasil', link: '/research/market-size/' },
          ],
        },
        {
          label: 'Arquitetura',
          items: [
            { label: 'Domain Kernel (Emmett)', link: '/architecture/domain-kernel/' },
            { label: 'Interfaces (UI · MCP · REST)', link: '/architecture/interfaces/' },
            { label: 'Stack', link: '/architecture/stack/' },
            { label: 'Chain of Custody', link: '/architecture/chain-of-custody/' },
            { label: 'LGPD & Crypto', link: '/architecture/lgpd-crypto/' },
            { label: 'Compliance Engine', link: '/architecture/compliance-engine/' },
          ],
        },
        {
          label: 'Negócio',
          items: [
            { label: 'OSS Business Model', link: '/business/oss-model/' },
            { label: 'Revenue Model', link: '/business/revenue-model/' },
            { label: 'Go-to-Market', link: '/business/gtm/' },
          ],
        },
        { label: 'Roadmap', link: '/roadmap/' },
        { label: 'Premissas Regulatórias', link: '/regulatory-assumptions/' },
        {
          label: 'Decisões (ADR)',
          items: [
            { label: 'ADR-001 — Domain Kernel + Emmett', link: '/adr/0001-domain-kernel-emmett/' },
            { label: 'ADR-002 — MCP-First Surface', link: '/adr/0002-mcp-first-surface/' },
          ],
        },
        { label: 'Releases', autogenerate: { directory: 'releases' } },
      ],
    }),
  ],
});
