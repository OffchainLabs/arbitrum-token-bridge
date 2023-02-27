import { useEffect, useMemo } from 'react'
import { constants } from 'ethers'

import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import {
  DepositCardContainer,
  DepositL1TxStatus,
  DepositL2TxStatus
} from './DepositCard'
import { useAppContextDispatch } from '../App/AppContext'
import { formatAmount } from '../../util/NumberUtils'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useTokenDecimals } from '../../hooks/useTokenDecimals'
import { useBalance } from 'token-bridge-sdk'
import { Loader } from '../common/atoms/Loader'

export function DepositCardSuccess({ tx }: { tx: MergedTransaction }) {
  const {
    app: {
      arbTokenBridge: { walletAddress, bridgeTokens, token }
    }
  } = useAppState()
  const dispatch = useAppContextDispatch()
  const {
    l2: { provider: L2Provider }
  } = useNetworksAndSigners()

  const {
    eth: [ethBalance],
    erc20: [erc20Balances]
  } = useBalance({
    provider: L2Provider,
    walletAddress: walletAddress
  })

  useEffect(() => {
    if (typeof bridgeTokens === 'undefined') {
      return
    }
    // Add token to bridge just in case the user navigated away while the deposit was in-flight
    if (tx.tokenAddress && !bridgeTokens[tx.tokenAddress]) {
      token.add(tx.tokenAddress)
    }
  }, [])

  const balance = useMemo(() => {
    if (!ethBalance || !erc20Balances) {
      return null
    }

    if (tx.asset === 'eth') {
      return ethBalance
    }

    if (!tx.tokenAddress) {
      return null
    }

    if (typeof bridgeTokens === 'undefined') {
      return null
    }

    const l2Address = bridgeTokens[tx.tokenAddress]?.l2Address

    if (!l2Address) {
      return constants.Zero
    }

    return erc20Balances[l2Address] ?? null
  }, [bridgeTokens, erc20Balances, ethBalance, tx])

  useEffect(() => {
    const timeout = setTimeout(() => {
      dispatch({ type: 'set_tx_as_seen', payload: tx.txId })
      // Disappears after 60 seconds
    }, 60 * 1000)

    return () => {
      clearTimeout(timeout)
    }
    // It's safe to omit `dispatch` from the dependency array: https://reactjs.org/docs/hooks-reference.html#usereducer
  }, [tx.txId])

  const decimals = useTokenDecimals(bridgeTokens, tx.tokenAddress)

  return (
    <DepositCardContainer tx={tx} dismissable>
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
            <Loader color="black" size="small" />
          )}
        </div>
      </span>

      <div className="h-2" />
      <div className="flex flex-col font-light">
        <span className="text-lg text-lime-dark">
          L1 transaction: <DepositL1TxStatus tx={tx} />
        </span>
        <span className="text-lg text-lime-dark">
          L2 transaction: <DepositL2TxStatus tx={tx} />
        </span>
      </div>
    </DepositCardContainer>
  )
}
