import { useMemo } from 'react'

import { useAppState } from '../../state'
import { useNativeCurrency } from '../useNativeCurrency'
import { useNetworksRelationship } from '../useNetworksRelationship'
import { useNetworks } from '../useNetworks'

export function useSelectedTokenDecimals() {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  return useMemo(
    () => (selectedToken ? selectedToken.decimals : nativeCurrency.decimals),
    [nativeCurrency, selectedToken]
  )
}
