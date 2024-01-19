import { useMemo } from 'react'

import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useAppState } from '../../state'
import { isNetwork } from '../../util/networks'
import { useETHPrice } from '../../hooks/useETHPrice'
import { formatUSD } from '../../util/NumberUtils'

export function ETHPrice({
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
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })
  const isBridgingEth = selectedToken === null && !nativeCurrency.isCustom
  const showPrice = useMemo(
    () => isBridgingEth && !isNetwork(childChain.id).isTestnet,
    [isBridgingEth, childChain.id]
  )
  const { ethToUSD } = useETHPrice()

  if (!showPrice) {
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
