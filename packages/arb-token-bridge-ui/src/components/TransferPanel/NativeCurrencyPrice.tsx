import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useAppState } from '../../state'
import { isNetwork } from '../../util/networks'
import { useETHPrice } from '../../hooks/useETHPrice'
import { formatUSD } from '../../util/NumberUtils'

export function NativeCurrencyPrice({
  amountInEth,
  showBrackets = false
}: {
  amountInEth: number
  showBrackets?: boolean
}) {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { childChain, childChainProvider } = useNetworksRelationship(networks)
  const { isTestnet } = isNetwork(childChain.id)

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  // currently only ETH price is supported
  const isBridgingEth = selectedToken === null && !nativeCurrency.isCustom
  const { ethToUSD } = useETHPrice()

  if (isTestnet || !isBridgingEth) {
    return null
  }

  return (
    <span className="tabular-nums">
      {showBrackets && '('}
      {formatUSD(ethToUSD(amountInEth))}
      {showBrackets && ')'}
    </span>
  )
}
