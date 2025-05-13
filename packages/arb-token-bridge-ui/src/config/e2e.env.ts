import { z } from 'zod'

/**
 * E2E Test environment schema
 */
const e2eSchema = z.object({
  // RPC URLs
  NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L1: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L2: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_NITRO_TESTNODE_L3: z.string().url().optional(),
  NEXT_PUBLIC_RPC_URL_SEPOLIA: z.string().url().optional(),

  // Test configuration
  TEST_FILE: z.string().optional(),
  E2E_ORBIT: z.coerce.boolean().optional().default(false),
  E2E_ORBIT_CUSTOM_GAS_TOKEN: z.coerce.boolean().optional().default(false),
  ORBIT_CUSTOM_GAS_TOKEN: z.coerce.boolean().optional().default(false),
  CYPRESS_RECORD_VIDEO: z.coerce.boolean().optional().default(false),

  // Private keys
  PRIVATE_KEY_CUSTOM: z.string().min(64).optional(),
  PRIVATE_KEY_USER: z.string().min(64).max(66).optional(), // Ethereum private key format (0x + 64 chars)

  // Infura configuration
  NEXT_PUBLIC_INFURA_KEY: z.string().min(1)
})

/**
 * Validate E2E environment variables
 */
function validateE2EEnv() {
  try {
    return e2eSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { errors } = error
      const errorMessage =
        'Invalid E2E environment variables:\n' +
        errors.map(err => `- ${err.path.join('.')}: ${err.message}`).join('\n')
      throw new Error(errorMessage)
    }
    throw error
  }
}

/**
 * Validated E2E environment variables
 */
export const e2eEnv = validateE2EEnv()

/**
 * Type definition for the E2E environment
 */
export type E2EEnv = z.infer<typeof e2eSchema>

/**
 * Export schema for use in other parts of the application
 */
export const e2eSchemas = {
  e2e: e2eSchema
} as const

/**
 * Helper functions for common E2E environment checks
 */
export const isOrbitTest = [
  e2eEnv.E2E_ORBIT,
  e2eEnv.E2E_ORBIT_CUSTOM_GAS_TOKEN
].includes(true)
export const shouldRecordVideo = e2eEnv.CYPRESS_RECORD_VIDEO
