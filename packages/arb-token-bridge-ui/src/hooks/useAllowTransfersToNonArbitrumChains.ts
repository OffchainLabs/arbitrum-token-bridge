import { useMode } from './useMode'

/**
 * Hook to control whether transfers to non-Arbitrum chains are allowed.
 * This allows the bridge UI to be used as an "Arbitrum onboarding tool only"
 * by restricting transfers to only Arbitrum networks.
 */
export function useAllowTransfersToNonArbitrumChains(): boolean {
  const { embedMode } = useMode()

  return !embedMode
}
