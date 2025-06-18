import { useArbQueryParams, ModeParamEnum } from './useArbQueryParams'

/**
 * Hook to get the current embed mode from the URL query parameters.
 * @returns The current embed mode: ModeParamEnum.EMBED, ModeParamEnum.EMBED_COMPACT, or undefined for normal mode
 */
export function useEmbedMode() {
  const [{ mode }] = useArbQueryParams()

  const embedMode = mode === ModeParamEnum.EMBED
  // later, we can have other booleans like `embedCompactMode` depending on the requirements

  return { mode, embedMode }
}
