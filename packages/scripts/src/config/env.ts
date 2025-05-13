import { z } from "zod";

/**
 * Environment schema for scripts
 */
const envSchema = z.object({
  // GitHub configuration
  GITHUB_TOKEN: z.string().optional(),
  ISSUE_NUMBER: z.coerce.number().optional(),

  // Infura configuration
  NEXT_PUBLIC_INFURA_KEY: z.string().min(1).optional(),
});

/**
 * Validate environment variables
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { errors } = error;
      const errorMessage =
        "Invalid environment variables:\n" +
        errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n");
      throw new Error(errorMessage);
    }
    throw error;
  }
}

/**
 * Validated environment variables
 */
export const env = validateEnv();

/**
 * Type definition for the environment
 */
export type Env = z.infer<typeof envSchema>;
