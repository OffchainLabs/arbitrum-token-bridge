import { BigNumber } from 'ethers'

import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import { NativeCurrencyErc20 } from '../../../hooks/useNativeCurrency'
import { Loader } from '../../common/atoms/Loader'
import { TokenSymbolWithExplorerLink } from '../../common/TokenSymbolWithExplorerLink'
import { formatAmount } from '../../../util/NumberUtils'

import { NetworkType } from './utils'

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
          decimals: isParentChain ? forToken.decimals : 18
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
