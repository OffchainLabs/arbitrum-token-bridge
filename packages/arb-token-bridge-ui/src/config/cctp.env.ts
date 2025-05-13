import { z } from 'zod'

/**
 * CCTP E2E Test environment schema
 */
const cctpSchema = z.object({
  // RPC URLs
  NEXT_PUBLIC_RPC_URL_SEPOLIA: z.string().url().optional(),

  // Test configuration
  TEST_FILE: z.string().optional(),
  CYPRESS_RECORD_VIDEO: z.coerce.boolean().optional().default(false),

  // Private keys
  PRIVATE_KEY_CCTP: z.string().min(64).optional(),
  PRIVATE_KEY_USER: z.string().min(64).max(66).optional(), // Ethereum private key format (0x + 64 chars)

  // Infura configuration
  NEXT_PUBLIC_INFURA_KEY: z.string().min(1)
})

/**
 * Validate CCTP E2E environment variables
 */
function validateCctpEnv() {
  try {
    return cctpSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { errors } = error
      const errorMessage =
        'Invalid CCTP E2E environment variables:\n' +
        errors.map(err => `- ${err.path.join('.')}: ${err.message}`).join('\n')
      throw new Error(errorMessage)
    }
    throw error
  }
}

/**
 * Validated CCTP E2E environment variables
 */
export const cctpEnv = validateCctpEnv()

/**
 * Type definition for the CCTP E2E environment
 */
export type CctpEnv = z.infer<typeof cctpSchema>

/**
 * Export schema for use in other parts of the application
 */
export const cctpSchemas = {
  cctp: cctpSchema
} as const

/**
 * Helper functions for common CCTP E2E environment checks
 */
export const shouldRecordVideo = cctpEnv.CYPRESS_RECORD_VIDEO
