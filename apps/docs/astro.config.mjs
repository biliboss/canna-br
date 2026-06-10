import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 4335,
    host: '127.0.0.1',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    starlight({
      title: 'canna-oss',
      description: 'OSS cannabis association management system — RDC 1.014 sandbox BR',
      customCss: ['./src/styles/global.css', './src/styles/brand.css'],
      defaultLocale: 'root',
      locales: {
        root: { label: 'Português', lang: 'pt-BR' },
        en: { label: 'English', lang: 'en' },
        es: { label: 'Español', lang: 'es' },
      },
      sidebar: [
        // ── Root (PT) sidebar — EN/ES translated labels via translations field ──
        {
          label: 'Visão Geral',
          translations: { en: 'Overview', es: 'Visión General' },
          link: '/',
        },
        {
          label: 'Trust · LGPD',
          translations: { en: 'Trust · LGPD', es: 'Confianza · LGPD' },
          link: '/trust/',
        },
        {
          label: 'Sobre o Projeto',
          translations: { en: 'About', es: 'Acerca de' },
          link: '/about/',
        },
        {
          label: 'Mercado',
          translations: { en: 'Market', es: 'Mercado' },
          link: '/idea/market/',
        },
        {
          label: 'Vagas Piloto',
          translations: { en: 'Pilot Slots', es: 'Plazas Piloto' },
          link: '/open/seed-associations/',
        },
        {
          label: 'Domain Model',
          translations: { en: 'Domain Model', es: 'Modelo de Dominio' },
          items: [
            { label: 'Event Storming', link: '/domain/event-storming/' },
            { label: 'Bounded Contexts', link: '/domain/bounded-contexts/' },
            { label: 'Domain Events', link: '/domain/domain-events/' },
            { label: 'Invariantes', translations: { en: 'Invariants', es: 'Invariantes' }, link: '/domain/invariants/' },
          ],
        },
        {
          label: 'Research',
          translations: { en: 'Research', es: 'Investigación' },
          items: [
            { label: 'Marco Legal BR', link: '/research/legal-framework/' },
            { label: 'ANVISA Sandbox', link: '/research/anvisa-sandbox/' },
            { label: 'ANVISA Validation Pathway', link: '/research/anvisa-validation-pathway/' },
            { label: 'SNGPC Integration', link: '/research/sngpc/' },
            { label: 'Software Landscape', link: '/research/software-landscape/' },
            { label: 'Modelos Internacionais', translations: { en: 'International Models', es: 'Modelos Internacionales' }, link: '/research/international-models/' },
            { label: 'Mercado Brasil', translations: { en: 'Brazil Market', es: 'Mercado Brasil' }, link: '/research/market-size/' },
          ],
        },
        {
          label: 'Arquitetura',
          translations: { en: 'Architecture', es: 'Arquitectura' },
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
          translations: { en: 'Business', es: 'Negocio' },
          items: [
            { label: 'OSS Business Model', link: '/business/oss-model/' },
            { label: 'Revenue Model', link: '/business/revenue-model/' },
            { label: 'Go-to-Market', link: '/business/gtm/' },
          ],
        },
        { label: 'Roadmap', link: '/roadmap/' },
        {
          label: 'Premissas Regulatórias',
          translations: { en: 'Regulatory Premises', es: 'Premisas Regulatorias' },
          link: '/regulatory-assumptions/',
        },
        {
          label: 'Decisões (ADR)',
          translations: { en: 'Decisions (ADR)', es: 'Decisiones (ADR)' },
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
