import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import starlightBlog from 'starlight-blog';
import mermaid from 'astro-mermaid';

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
    // astro-mermaid renders ```mermaid fences client-side (no headless browser
    // at build). MUST come BEFORE starlight. autoTheme follows Starlight's
    // <html data-theme> → mermaid 'dark' theme on dark, 'default' on light.
    mermaid({
      theme: 'dark',
      autoTheme: true,
    }),
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
        // Default OG/Twitter image for every Starlight content page (blog,
        // business, apps, roadmap…). Marketing pages set their own via
        // MarketingLayout and don't go through this head.
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: 'https://canna-br.fonsecagabriel.com.br/og-default.png' },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:image', content: 'https://canna-br.fonsecagabriel.com.br/og-default.png' },
        },
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
        },
        // a11y: Starlight's <starlight-theme-select>/<starlight-lang-select>
        // render native <select> with no id/name/aria-label (theme + language,
        // twice each = 4 unlabeled form fields, flagged by the browser). They're
        // upstream components we can't edit inline, so label them at runtime,
        // localized off <html lang>. Idempotent + works on bfcache restore.
        {
          tag: 'script',
          content: `(function(){function L(){var pt=(document.documentElement.lang||'pt').slice(0,2);var T={pt:'Selecionar tema',en:'Select theme',es:'Seleccionar tema'};var G={pt:'Selecionar língua',en:'Select language',es:'Seleccionar idioma'};var t=T[pt]||T.pt,g=G[pt]||G.pt;var n=0;document.querySelectorAll('starlight-theme-select select').forEach(function(s){if(!s.getAttribute('aria-label')){s.setAttribute('aria-label',t);}if(!s.id){s.id='sl-theme-select-'+(n++);}if(!s.name){s.name='sl-theme-select';}});var m=0;document.querySelectorAll('starlight-lang-select select').forEach(function(s){if(!s.getAttribute('aria-label')){s.setAttribute('aria-label',g);}if(!s.id){s.id='sl-lang-select-'+(m++);}if(!s.name){s.name='sl-lang-select';}});var S={pt:'Pesquisar',en:'Search',es:'Buscar'};var sl=S[pt]||S.pt;var k=0;document.querySelectorAll('.pagefind-ui__search-input').forEach(function(s){if(!s.getAttribute('aria-label')){s.setAttribute('aria-label',sl);}if(!s.id){s.id='pagefind-search-'+(k++);}});}if(document.readyState!=='loading'){L();}else{document.addEventListener('DOMContentLoaded',L);}window.addEventListener('pageshow',L);var mo=new MutationObserver(function(){if(document.querySelector('.pagefind-ui__search-input:not([aria-label])')){L();}});mo.observe(document.documentElement,{childList:true,subtree:true});})();`,
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
        {
          label: 'Roadmap',
          items: [
            { label: 'Visão Geral', translations: { en: 'Overview', es: 'Visión General' }, link: '/roadmap/' },
            { label: 'v0.1.0 — Fundação Usável', translations: { en: 'v0.1.0 — Usable Foundation', es: 'v0.1.0 — Fundación Usable' }, link: '/roadmap/v0-1-0/' },
          ],
        },
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
            { label: 'ADR-003 — Event Store SurrealDB', link: '/adr/0003-stack-pivot-nats-surreal-dbos/' },
            { label: 'ADR-004 — Simulação em VPS', link: '/adr/0004-simulation-vps/' },
            { label: 'ADR-005 — Vídeo + Perguntas Públicas', link: '/adr/0005-video-candidatura-perguntas-publicas/' },
          ],
        },
        {
          label: 'Aplicativos',
          translations: { en: 'Apps', es: 'Aplicaciones' },
          items: [
            {
              label: 'Galeria',
              translations: { en: 'Gallery', es: 'Galería' },
              link: '/apps/',
            },
            {
              label: 'Operação',
              translations: { en: 'Operations', es: 'Operación' },
              items: [
                { label: 'Cartão de Cota', translations: { en: 'Quota Card', es: 'Tarjeta de Cuota' }, link: '/apps/member-quota-card/' },
                { label: 'Ciclo de Vida dos Membros', translations: { en: 'Member Lifecycle', es: 'Ciclo de Vida Miembros' }, link: '/apps/member-lifecycle-board/' },
                { label: 'Seletor de Lotes (FIFO)', translations: { en: 'Lot Picker (FIFO)', es: 'Selector de Lotes (FIFO)' }, link: '/apps/inventory-lot-picker/' },
                { label: 'Formulário de Dispensação', translations: { en: 'Dispensation Form', es: 'Formulario de Dispensación' }, link: '/apps/dispensation-form/' },
                { label: 'Timeline de Rastreabilidade', translations: { en: 'Traceability Timeline', es: 'Línea de Tiempo Trazabilidad' }, link: '/apps/traceability-timeline/' },
              ],
            },
            {
              label: 'Gestão',
              translations: { en: 'Management', es: 'Gestión' },
              items: [
                { label: 'Scorecard de Cotas', translations: { en: 'Quota Scorecard', es: 'Scorecard de Cuotas' }, link: '/apps/quota-consumption-scorecard/' },
                { label: 'Throughput de Dispensações', translations: { en: 'Dispensation Throughput', es: 'Throughput de Dispensaciones' }, link: '/apps/dispensation-throughput-bar/' },
                { label: 'Fila SNGPC — Envelhecimento', translations: { en: 'SNGPC Queue Aging', es: 'Cola SNGPC — Antigüedad' }, link: '/apps/sngpc-submission-aging/' },
                { label: 'Validade de Prescrições', translations: { en: 'Prescription Expiry', es: 'Vencimiento de Recetas' }, link: '/apps/prescription-expiry-scatter/' },
                { label: 'Painel de Lotes — Status', translations: { en: 'Lot Status Board', es: 'Panel de Lotes — Estado' }, link: '/apps/inventory-lot-status-board/' },
              ],
            },
          ],
        },
        {
          label: 'Releases',
          items: [
            { label: 'Apps v0.1.0', link: '/releases/apps-v0-1-0/' },
            { label: 'v0.2.1 — Compliance Spine', link: '/releases/v0-2-1/' },
            { label: 'v0.1.0 — Coordenação + Custo', link: '/releases/v0-1-0-coordenacao-metricas/' },
          ],
        },
      ],
    }),
  ],
});
