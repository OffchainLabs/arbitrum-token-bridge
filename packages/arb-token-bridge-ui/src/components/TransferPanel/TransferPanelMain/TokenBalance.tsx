import { useMemo } from 'react'
import { BigNumber } from 'ethers'

import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import {
  NativeCurrencyErc20,
  useNativeCurrency
} from '../../../hooks/useNativeCurrency'
import { Loader } from '../../common/atoms/Loader'
import { TokenSymbolWithExplorerLink } from '../../common/TokenSymbolWithExplorerLink'
import { formatAmount } from '../../../util/NumberUtils'

import { NetworkType } from './utils'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'

export function TokenBalance({
  forToken,
  balance,
  on,
  prefix = '',
  tokenSymbolOverride
}: {
  forToken: ERC20BridgeToken | NativeCurrencyErc20 | null
  balance: BigNumber | null
  on: NetworkType
  prefix?: string
  tokenSymbolOverride?: string
}) {
  const isParentChain = on === NetworkType.parentChain
  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)
  const nativeCurrency = useNativeCurrency({
    provider: childChainProvider
  })

  const isCustomNativeCurrency =
    nativeCurrency.isCustom &&
    forToken?.address.toLowerCase() === nativeCurrency.address.toLowerCase()

  const decimals = useMemo(() => {
    if (!isParentChain && isCustomNativeCurrency) {
      // Native currency on Orbit chain, always 18 decimals
      return 18
    }
    return forToken?.decimals
  }, [forToken?.decimals, isCustomNativeCurrency, isParentChain])

  if (!forToken) {
    return null
  }

  if (!balance) {
    return (
      <p className="flex items-center gap-1">
        <span className="font-light">{prefix}</span>
        <Loader color="white" size="small" />
      </p>
    )
  }

  const tokenSymbol = tokenSymbolOverride ?? forToken.symbol

  return (
    <p>
      <span className="font-light">{prefix}</span>
      <span aria-label={`${tokenSymbol} balance amount on ${on}`}>
        {formatAmount(balance, {
          decimals
        })}
      </span>{' '}
      <TokenSymbolWithExplorerLink
        token={forToken}
        tokenSymbolOverride={tokenSymbolOverride}
        isParentChain={isParentChain}
      />
    </p>
  )
}
