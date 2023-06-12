import { useEffect, useMemo } from 'react'
import { Loader } from '../common/atoms/Loader'
import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import {
  WithdrawalCardContainer,
  WithdrawalL1TxStatus,
  WithdrawalL2TxStatus
} from './WithdrawalCard'
import { formatAmount } from '../../util/NumberUtils'
import { useTokenDecimals } from '../../hooks/useTokenDecimals'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useBalance } from '../../hooks/useBalance'
import { sanitizeTokenSymbol } from '../../util/TokenUtils'

export function WithdrawalCardExecuted({ tx }: { tx: MergedTransaction }) {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const { walletAddress, bridgeTokens } = arbTokenBridge
  const { l1, l2 } = useNetworksAndSigners()
  const {
    eth: [ethL1Balance],
    erc20: [erc20L1Balances]
  } = useBalance({ provider: l1.provider, walletAddress })

  const tokenSymbol = useMemo(
    () =>
      sanitizeTokenSymbol(tx.asset, {
        erc20L1Address: tx.tokenAddress,
        chain: l2.network
      }),
    [tx, l2]
  )

  useEffect(() => {
    // Add token to bridge just in case
    if (typeof arbTokenBridge.bridgeTokens === 'undefined') {
      return
    }

    const { tokenAddress } = tx
    if (tokenAddress && !arbTokenBridge.bridgeTokens[tokenAddress]) {
      arbTokenBridge.token.add(tokenAddress)
    }
  }, [])

  const balance = useMemo(() => {
    if (!ethL1Balance || !erc20L1Balances) {
      return null
    }

    if (tx.asset === 'eth') {
      return ethL1Balance
    }

    if (!tx.tokenAddress) {
      return null
    }

    return erc20L1Balances[tx.tokenAddress.toLowerCase()]
  }, [erc20L1Balances, ethL1Balance, tx])

  const decimals = useTokenDecimals(bridgeTokens, tx.tokenAddress)

  return (
    <WithdrawalCardContainer tx={tx}>
      <span className="text-4xl font-semibold text-ocl-blue">Success!</span>
      <span className="flex flex-col space-y-4 text-2xl font-light text-ocl-blue">
        <span>
          {tx.value} {tx.asset.toUpperCase()} has been moved to your wallet.
        </span>

        <div className="flex flex-row items-center space-x-2">
          <span className="font-medium">New balance:</span>
          {balance ? (
            <span className="font-medium">
              {formatAmount(balance, {
                decimals,
                symbol: tokenSymbol
              })}
            </span>
          ) : (
            <Loader size="small" color="black" />
          )}
        </div>
      </span>

      <div className="h-2" />
      <div className="flex flex-col font-light">
        <span className="flex flex-nowrap gap-1 text-base text-lime-dark">
          L2 transaction: <WithdrawalL2TxStatus tx={tx} />
        </span>
        <span className="flex flex-nowrap gap-1 text-base text-lime-dark">
          L1 transaction: <WithdrawalL1TxStatus tx={tx} />
        </span>
      </div>
    </WithdrawalCardContainer>
  )
}
