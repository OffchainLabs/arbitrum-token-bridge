import { useArbQueryParams, ModeParamEnum } from './useArbQueryParams'

export function useMode() {
  const [{ mode }] = useArbQueryParams()

  const embedMode = mode === ModeParamEnum.EMBED
  // later, we can have other booleans like `embedCompactMode` depending on the requirements

  return { mode, embedMode }
}
