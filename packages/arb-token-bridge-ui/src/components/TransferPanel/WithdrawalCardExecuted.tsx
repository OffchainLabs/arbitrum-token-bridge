import { useEffect, useMemo } from 'react'
import Loader from 'react-loader-spinner'

import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import { useAppContextDispatch } from '../App/AppContext'
import {
  WithdrawalCardContainer,
  WithdrawalL1TxStatus,
  WithdrawalL2TxStatus
} from './WithdrawalCard'
import { formatAmount } from '../../util/NumberUtils'
import { useTokenDecimals } from '../../hooks/useTokenDecimals'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useBalance } from 'token-bridge-sdk'

export function WithdrawalCardExecuted({ tx }: { tx: MergedTransaction }) {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const { walletAddress, bridgeTokens } = arbTokenBridge
  const dispatch = useAppContextDispatch()
  const { l1 } = useNetworksAndSigners()
  const {
    eth: [ethL1Balance],
    erc20: [erc20L1Balances]
  } = useBalance({ provider: l1.provider, walletAddress })

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
      <span className="text-4xl font-semibold text-blue-arbitrum">
        Success!
      </span>
      <span className="flex flex-col space-y-4 text-2xl font-light text-blue-arbitrum">
        <span>
          {tx.value} {tx.asset.toUpperCase()} has been moved to your wallet.
        </span>

        <div className="flex flex-row items-center space-x-2">
          <span className="font-medium">New balance:</span>
          {balance ? (
            <span className="font-medium">
              {formatAmount(balance, {
                decimals,
                symbol: tx.asset.toUpperCase()
              })}
            </span>
          ) : (
            <Loader type="Oval" height={16} width={16} color="black" />
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
