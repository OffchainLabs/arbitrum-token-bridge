export const isE2eEnvironment =
  !!(typeof window !== 'undefined' && window && window.Cypress) ||
  process.env.E2E === 'true'

// non-production environment can be e2e, vercel preview and local dev environment
export const isNonProductionEnvironment =
  isE2eEnvironment || process.env.NODE_ENV !== 'production'
