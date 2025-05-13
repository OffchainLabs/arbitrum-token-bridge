import { z } from 'zod'

/**
 * Runtime environment schema
 */
const runtimeSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  NEXT_PUBLIC_IS_E2E_TEST: z.coerce.boolean().optional().default(false),
  // Test configuration
  TEST_FILE: z.string().optional(),
  E2E_ORBIT: z.coerce.boolean().optional().default(false),
  E2E_ORBIT_CUSTOM_GAS_TOKEN: z.coerce.boolean().optional().default(false),
  ORBIT_CUSTOM_GAS_TOKEN: z.coerce.boolean().optional().default(false)
})

/**
 * Server-side environment variables schema
 */
const serverSchema = z.object({
  // Graph API keys
  THE_GRAPH_NETWORK_API_KEY: z.string().min(1).optional(),
  SELF_HOSTED_SUBGRAPH_API_KEY: z.string().min(1).optional(),

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().url(),

  // Test configuration
  PRIVATE_KEY_USER: z.string().min(64).max(66).optional(), // Ethereum private key format (0x + 64 chars)
  PRIVATE_KEY_CUSTOM: z.string().min(64).optional(),
  PRIVATE_KEY_CCTP: z.string().min(64).optional(),
  SKIP_METAMASK_SETUP: z.coerce.boolean().optional().default(false),
  DEBUG_PROVIDER: z.coerce.boolean().optional().default(false),
  CYPRESS_RECORD_VIDEO: z.coerce.boolean().optional().default(false),
  NETWORK_NAME: z.string().min(1).optional().default('localhost'),

  // Monitor RPC URLs
  NOVA_MONITOR_RPC_URL: z.string().url().optional(),
  ARB_ONE_MONITOR_RPC_URL: z.string().url().optional(),
  INCLUDE_ARB_ONE_AS_CORE_CHAIN: z.coerce.boolean().optional().default(false),

  // GitHub configuration
  GITHUB_TOKEN: z.string().optional(),
  ISSUE_NUMBER: z.coerce.number().optional()
})

/**
 * Client-side environment variables schema (NEXT_PUBLIC_)
 */
const clientSchema = z.object({
  // RPC Provider configuration
  NEXT_PUBLIC_RPC_PROVIDER: z.enum(['infura', 'alchemy']).default('infura'),

  // Infura configuration
  NEXT_PUBLIC_INFURA_KEY: z.string().min(1),
  NEXT_PUBLIC_INFURA_KEY_ETHEREUM: z.string().min(1).optional(),
  NEXT_PUBLIC_INFURA_KEY_SEPOLIA: z.string().min(1).optional(),
  NEXT_PUBLIC_INFURA_KEY_HOLESKY: z.string().min(1).optional(),
  NEXT_PUBLIC_INFURA_KEY_ARBITRUM_ONE: z.string().min(1).optional(),
  NEXT_PUBLIC_INFURA_KEY_BASE: z.string().min(1).optional(),
  NEXT_PUBLIC_INFURA_KEY_ARBITRUM_SEPOLIA: z.string().min(1).optional(),
  NEXT_PUBLIC_INFURA_KEY_BASE_SEPOLIA: z.string().min(1).optional(),

  // Alchemy configuration
  NEXT_PUBLIC_ALCHEMY_KEY: z.string().min(1).optional(),

  // Custom RPC URLs
  NEXT_PUBLIC_RPC_URL_ETHEREUM: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_SEPOLIA: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_HOLESKY: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_ARBITRUM_ONE: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_ARBITRUM_NOVA: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_BASE: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_ARBITRUM_SEPOLIA: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA: z.string().url().optional(),

  // Nitro Testnode URLs
  NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1: z
    .string()
    .url()
    .optional()
    .default('http://127.0.0.1:8545'),
  NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L2: z
    .string()
    .url()
    .optional()
    .default('http://127.0.0.1:8547'),
  NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L3: z
    .string()
    .url()
    .optional()
    .default('http://127.0.0.1:3347'),

  // Optimization flags
  NEXT_PUBLIC_PROVIDER_CACHE_TX_RECEIPTS: z.string().optional(),
  NEXT_PUBLIC_PROVIDER_BATCH_RPC: z.string().optional(),
  NEXT_PUBLIC_PROVIDER_CACHE_EVENT_LOGS: z.string().optional(),

  // WalletConnect
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1),

  // Analytics and monitoring
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SCREENING_API_ENDPOINT: z.string().url().optional(),

  // Chain IDs
  NEXT_PUBLIC_CHAIN_ID: z.coerce.number(),
  NEXT_PUBLIC_ARBITRUM_CHAIN_ID: z.coerce.number(),

  // Local RPC URLs
  NEXT_PUBLIC_LOCAL_ETHEREUM_RPC_URL: z.string().url(),
  NEXT_PUBLIC_LOCAL_ARBITRUM_RPC_URL: z.string().url()
})

/**
 * Combined environment schema
 */
const envSchema = z.object({
  ...runtimeSchema.shape,
  ...serverSchema.shape,
  ...clientSchema.shape
})

/**
 * Validate environment variables
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { errors } = error
      const errorMessage =
        'Invalid environment variables:\n' +
        errors.map(err => `- ${err.path.join('.')}: ${err.message}`).join('\n')
      throw new Error(errorMessage)
    }
    throw error
  }
}

/**
 * Validated environment variables
 */
export const env = validateEnv()

/**
 * Type definition for the environment
 */
export type Env = z.infer<typeof envSchema>

/**
 * Export schemas for use in other parts of the application
 */
export const schemas = {
  runtime: runtimeSchema,
  server: serverSchema,
  client: clientSchema,
  combined: envSchema
} as const

/**
 * Helper functions for common environment checks
 */
export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
export const isTest = env.NODE_ENV === 'test'
export const isE2ETest = env.NEXT_PUBLIC_IS_E2E_TEST
