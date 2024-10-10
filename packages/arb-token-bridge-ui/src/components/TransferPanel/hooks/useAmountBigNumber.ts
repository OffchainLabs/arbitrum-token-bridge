import { useMemo } from 'react'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { useAppState } from '../../../state'
import { constants, utils } from 'ethers'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'

export function useAmountBigNumber() {
  const {
    app: { selectedToken }
  } = useAppState()
  const [{ amount }] = useArbQueryParams()
  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  return useMemo(() => {
    try {
      const amountSafe = amount || '0'

      if (selectedToken) {
        return utils.parseUnits(amountSafe, selectedToken.decimals)
      }

      return utils.parseUnits(amountSafe, nativeCurrency.decimals)
    } catch (error) {
      return constants.Zero
    }
  }, [amount, selectedToken, nativeCurrency])
}
