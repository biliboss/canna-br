/**
 * FONTE UNICA DA VERDADE — alterar aqui propaga pra todo o site.
 * Paginas .mdx e .astro importam daqui. NUNCA hardcodar estes numeros em conteudo.
 *
 * Valores canonicos ratificados por Gabriel Fonseca em 2026-06-10.
 * Origem: CANONICAL VALUES declarados na sessao de coordenacao.
 */

// ---------------------------------------------------------------------------
// Helpers de formatacao
// ---------------------------------------------------------------------------

/** Formata numero em BRL sem decimais, com separador de milhar pt-BR.
 *  fmtBRL(490)   => "R$ 490"
 *  fmtBRL(2200)  => "R$ 2.200"
 *  fmtBRL(13020) => "R$ 13.020"
 */
export function fmtBRL(n: number): string {
  return (
    "R$ " +
    n.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

/** Formata numero em USD aproximado sem decimais.
 *  fmtUSD(98)  => "~US$ 98"
 *  fmtUSD(440) => "~US$ 440"
 */
export function fmtUSD(n: number): string {
  return (
    "~US$ " +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

/** Formata intervalo de BRL. fmtBRLRange(60, 85) => "R$ 60–R$ 85" */
export function fmtBRLRange(lo: number, hi: number): string {
  return `${fmtBRL(lo)}–${fmtBRL(hi)}`;
}

/** Formata intervalo percentual. fmtPctRange(73, 90) => "73–90%" */
export function fmtPctRange(lo: number, hi: number): string {
  return `${lo}–${hi}%`;
}

// ---------------------------------------------------------------------------
// Constante principal
// ---------------------------------------------------------------------------

export const SITE = {
  /** Taxa de cambio de referencia (BRL/USD). Nao usar pra transacoes reais. */
  usdRate: 5.0,

  // -------------------------------------------------------------------------
  // Pricing
  // -------------------------------------------------------------------------
  pricing: {
    essencial: {
      label: "Essencial",
      brl: 490,
      usd: 98,
      membersLimit: 50,
      membersLabel: "ate 50 membros",
      displayBRL: "R$ 490/mes",
      displayUSD: "~US$ 98/mes",
      tagline: "Ideal para associacoes pequenas que estao comecando",
    },
    profissional: {
      label: "Profissional",
      brl: 990,
      usd: 198,
      membersLimit: 200,
      membersLabel: "ate 200 membros",
      displayBRL: "R$ 990/mes",
      displayUSD: "~US$ 198/mes",
      tagline: "Para associacoes em crescimento com necessidades avancadas",
    },
    rede: {
      label: "Rede / Enterprise",
      brl: 2200,
      usd: 440,
      membersLimit: null, // ilimitado
      membersLabel: "membros ilimitados",
      displayBRL: "R$ 2.200/mes",
      displayUSD: "~US$ 440/mes",
      tagline: "SLA dedicado + dashboard de federacao para redes",
      features: ["SLA dedicado", "Dashboard de federacao", "Suporte prioritario"],
    },
    selfHost: {
      label: "Self-host (AGPL)",
      brl: 0,
      usd: 0,
      membersLimit: null,
      membersLabel: "membros ilimitados",
      displayBRL: "Gratis para sempre",
      displayUSD: "Free forever",
      tagline: "Codigo aberto AGPL — para quem quer rodar na propria infra",
    },
  },

  // -------------------------------------------------------------------------
  // Mercado
  // -------------------------------------------------------------------------
  market: {
    /** Associacoes mapeadas no Brasil (string pq e "400+") */
    mapped: "400+",
    mappedMin: 400,
    /** SAM enderecavel estimado */
    samAddressable: 315,
    displayMapped: "400+ associacoes mapeadas no Brasil",
    displaySAM: "~315 enderecaveis",
  },

  // -------------------------------------------------------------------------
  // Time / custos operacionais
  // -------------------------------------------------------------------------
  team: {
    /** Custo por pessoa fully loaded (USD/ano) */
    costPerPersonUSDYearly: 60_000,
    /** Equivalente em BRL/mes */
    costPerPersonBRLMonthly: 25_000,
    /** Time fundador: 3 pessoas */
    founderHeadcount: 3,
    /** Custo time fundador BRL/mes */
    founderCostBRLMonthly: 75_000,
    /** Organizacao minima saudavel BRL/mes */
    minHealthyOrgBRLMonthly: 92_500, // media de 90-95k
    minHealthyOrgBRLLow: 90_000,
    minHealthyOrgBRLHigh: 95_000,
    displayFounderCost: "R$ 75k/mes",
    displayMinOrg: "R$ 90–95k/mes",
  },

  // -------------------------------------------------------------------------
  // Breakeven
  // -------------------------------------------------------------------------
  breakeven: {
    /** Ticket medio ponderado BRL/mes */
    avgTicketBRL: 900,
    /** Associacoes necessarias (apenas Camada A, alto valor) */
    assocLayerAOnly: 105,
    /** Associacoes com mix de camadas C-E */
    assocLayersCE: { low: 30, high: 40 },
    /** Referencia de escala inicial */
    refAssocCount: 20,
    refMRRBRL: 18_000,
    refARRBRL: 216_000,
    /** Churn mensal referencia */
    churnRate: 0.02,
    displayChurn: "2%",
    displayAvgTicket: "~R$ 900/mes",
    displayRef: "20 assoc = R$ 18k MRR / R$ 216k ARR",
  },

  // -------------------------------------------------------------------------
  // Infra (custo por tenant)
  // -------------------------------------------------------------------------
  infra: {
    costPerTenantBRLLow: 60,
    costPerTenantBRLHigh: 85,
    grossMarginLow: 0.73,
    grossMarginHigh: 0.90,
    displayCostPerTenant: "R$ 60–85/mes por tenant",
    displayGrossMargin: "73–90%",
  },

  // -------------------------------------------------------------------------
  // Tese-teto (Infraeconomics, cenario v0.6-v0.8)
  // -------------------------------------------------------------------------
  thesisCeiling: {
    revenuePerMatureAssocBRLMonthly: 10_800,
    refAssocCount: 20,
    refRevenueBRLMonthly: 280_000,
    refCostBRLMonthly: 230_000,
    refResultBRLMonthly: 50_000,
    refMargin: 0.178,
    scenarioLabel: "Infraeconomics v0.6-v0.8",
    displayRevPerAssoc: "R$ 10.800/mes por associacao madura",
    displayRefRevenue: "20 assoc = R$ 280k/mes receita",
    displayRefResult: "R$ 50k resultado, margem 17,8%",
  },

  // -------------------------------------------------------------------------
  // Fact Deal (dado real de negociacao)
  // -------------------------------------------------------------------------
  factDeal: {
    assocCount: 36,
    modelLabel: "Modelo B",
    fixedFeeBRLMonthly: 1_500,
    perMemberFeeBRL: 8,
    avgMembersPerAssoc: 40,
    revenuePerAssocBRLMonthly: 320,
    totalMRRBRL: 13_020,
    totalARRBRL: 156_000,
    displayModel: "R$ 1.500/mes fixo + R$ 8/membro/mes",
    displayAvgRevPerAssoc: "~R$ 320/assoc/mes (media 40 membros)",
    displayMRR: "R$ 13.020/mes",
    displayARR: "R$ 156k ARR",
    displaySummary: "36 associacoes × Modelo B = R$ 13.020/mes (R$ 156k ARR)",
  },

  // -------------------------------------------------------------------------
  // Contrib (unidade contabil interna)
  // -------------------------------------------------------------------------
  contrib: {
    /** 1 CONTRIB = US$ 1 de referencia contabil */
    usdEquivalent: 1,
    description:
      "Medida de esforco e contribuicao. Conversao para BRL/USD e discricionaria.",
    displayUnit: "1 CONTRIB = US$ 1 (referencia)",
  },
} as const;

// ---------------------------------------------------------------------------
// Strings pre-compostas para uso direto em MDX onde composicao seria fragil
// ---------------------------------------------------------------------------

export const DISPLAY = {
  pricingEssencial: `${SITE.pricing.essencial.displayBRL} — ${SITE.pricing.essencial.membersLabel}`,
  pricingProfissional: `${SITE.pricing.profissional.displayBRL} — ${SITE.pricing.profissional.membersLabel}`,
  pricingRede: `${SITE.pricing.rede.displayBRL} — ${SITE.pricing.rede.membersLabel}`,
  pricingSelfHost: SITE.pricing.selfHost.displayBRL,

  marketContext: `${SITE.market.displayMapped}; SAM ${SITE.market.displaySAM}`,

  breakevenRef: SITE.breakeven.displayRef,
  infraCost: SITE.infra.displayCostPerTenant,
  infraMargin: SITE.infra.displayGrossMargin,

  factDealFull: SITE.factDeal.displaySummary,

  thesisCeiling20: `${SITE.thesisCeiling.displayRefRevenue} — ${SITE.thesisCeiling.displayRefResult}`,

  founderBurn: SITE.team.displayFounderCost,
  minOrgBurn: SITE.team.displayMinOrg,
} as const;

export type SiteConstants = typeof SITE;
export type DisplayStrings = typeof DISPLAY;
