import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import starlightBlog from 'starlight-blog';

export default defineConfig({
  site: 'https://canna-br.fonsecagabriel.com.br',
  server: {
    port: 4335,
    host: '127.0.0.1',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    starlight({
      plugins: [
        starlightBlog({
          title: 'Blog',
          prefix: 'blog',
          navigation: 'none',
          postCount: 10,
          recentPostCount: 5,
          authors: {
            gabriel: {
              name: 'Gabriel Fonseca',
              title: 'Fundador · canna-br',
              url: 'https://canna-br.fonsecagabriel.com.br/about/',
            },
          },
        }),
      ],
      title: 'canna-br',
      description: 'OSS cannabis association management system — RDC 1.014 sandbox BR',
      // theme-color matches the brand background so mobile browser chrome
      // (address/status bar) follows the dark/light theme. Paired via media so
      // the OS preference drives it. slate-950 #020617 dark / #ffffff light.
      head: [
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#020617', media: '(prefers-color-scheme: dark)' },
        },
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
        },
        // a11y: Starlight's <starlight-theme-select>/<starlight-lang-select>
        // render native <select> with no id/name/aria-label (theme + language,
        // twice each = 4 unlabeled form fields, flagged by the browser). They're
        // upstream components we can't edit inline, so label them at runtime,
        // localized off <html lang>. Idempotent + works on bfcache restore.
        {
          tag: 'script',
          content: `(function(){function L(){var pt=(document.documentElement.lang||'pt').slice(0,2);var T={pt:'Selecionar tema',en:'Select theme',es:'Seleccionar tema'};var G={pt:'Selecionar língua',en:'Select language',es:'Seleccionar idioma'};var t=T[pt]||T.pt,g=G[pt]||G.pt;var n=0;document.querySelectorAll('starlight-theme-select select').forEach(function(s){if(!s.getAttribute('aria-label')){s.setAttribute('aria-label',t);}if(!s.id){s.id='sl-theme-select-'+(n++);}if(!s.name){s.name='sl-theme-select';}});var m=0;document.querySelectorAll('starlight-lang-select select').forEach(function(s){if(!s.getAttribute('aria-label')){s.setAttribute('aria-label',g);}if(!s.id){s.id='sl-lang-select-'+(m++);}if(!s.name){s.name='sl-lang-select';}});}if(document.readyState!=='loading'){L();}else{document.addEventListener('DOMContentLoaded',L);}window.addEventListener('pageshow',L);})();`,
        },
      ],
      customCss: ['./src/styles/global.css', './src/styles/brand.css', './src/styles/blog.css'],
      defaultLocale: 'root',
      locales: {
        root: { label: 'Português', lang: 'pt-BR' },
        en: { label: 'English', lang: 'en' },
        es: { label: 'Español', lang: 'es' },
      },
      sidebar: [
        // ── Root (PT) sidebar — EN/ES translated labels via translations field ──
        {
          label: 'Blog',
          translations: { en: 'Blog', es: 'Blog' },
          link: '/blog/',
        },
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
            { label: 'Strain Databases', link: '/research/strain-databases/' },
          ],
        },
        {
          label: 'Arquitetura',
          translations: { en: 'Architecture', es: 'Arquitectura' },
          items: [
            { label: 'Domain Kernel (Emmett)', link: '/architecture/domain-kernel/' },
            { label: 'Token-Ledger', link: '/architecture/token-ledger/' },
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
            { label: 'Infraeconomics', link: '/business/tokenomics/' },
            { label: 'Token-Ledger v0.1', link: '/business/token-ledger/' },
            { label: 'DAO & Contribuição', translations: { en: 'DAO & Contribution', es: 'DAO y Contribución' }, link: '/business/dao/' },
            { label: 'Setor Público', link: '/business/setor-publico/' },
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
        {
          label: 'Aplicativos',
          translations: { en: 'Apps', es: 'Aplicaciones' },
          autogenerate: { directory: 'apps' },
        },
        { label: 'Releases', autogenerate: { directory: 'releases' } },
      ],
    }),
  ],
});
