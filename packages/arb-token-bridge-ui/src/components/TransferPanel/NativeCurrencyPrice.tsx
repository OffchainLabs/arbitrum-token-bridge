import { NativeCurrency } from '../../hooks/useNativeCurrency'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useAppState } from '../../state'
import { isNetwork } from '../../util/networks'
import { useETHPrice } from '../../hooks/useETHPrice'
import { formatUSD } from '../../util/NumberUtils'

export function useIsBridgingEth(childChainNativeCurrency: NativeCurrency) {
  const {
    app: { selectedToken }
  } = useAppState()
  const isBridgingEth =
    selectedToken === null && !childChainNativeCurrency.isCustom
  return isBridgingEth
}

export function NativeCurrencyPrice({
  amount,
  showBrackets = false
}: {
  amount: number | undefined
  showBrackets?: boolean
}) {
  const [networks] = useNetworks()
  const { childChain } = useNetworksRelationship(networks)
  const { isTestnet } = isNetwork(childChain.id)

  // currently only ETH price is supported
  const { ethToUSD } = useETHPrice()

  if (isTestnet) {
    return null
  }

  if (typeof amount === 'undefined') {
    return null
  }

  return (
    <span className="tabular-nums">
      {showBrackets && '('}
      {formatUSD(ethToUSD(amount))}
      {showBrackets && ')'}
    </span>
  )
}
