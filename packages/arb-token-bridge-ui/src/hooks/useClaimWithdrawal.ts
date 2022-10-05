import { useCallback, useState } from 'react'
import { AssetType, getUniqueIdOrHashFromEvent } from 'token-bridge-sdk'
import { utils } from 'ethers'

import { useAppState } from '../state'
import { MergedTransaction } from '../state/app/state'
import { useNetworksAndSigners } from './useNetworksAndSigners'
import { TokenSymbol } from 'token-bridge-sdk/dist/hooks/arbTokenBridge.types'

export type UseClaimWithdrawalResult = {
  claim: (tx: MergedTransaction) => void
  isClaiming: boolean
}

export function useClaimWithdrawal(): UseClaimWithdrawalResult {
  const {
    app: {
      arbTokenBridge: { eth, token, walletAddress },
      transactions
    }
  } = useAppState()
  const { l1 } = useNetworksAndSigners()
  const { signer: l1Signer } = l1

  const [isClaiming, setIsClaiming] = useState(false)

  const onL1TxSuccess = useCallback(
    (txHash: string) => {
      transactions.setTransactionSuccess(txHash)
    },
    [transactions]
  )

  const onL1TxFailure = useCallback(
    (txHash: string) => {
      transactions.setTransactionFailure(txHash)
    },
    [transactions]
  )

  async function claim(tx: MergedTransaction) {
    if (isClaiming) {
      return
    }

    if (tx.uniqueId === null) {
      return alert("Can't find withdrawal")
    }

    const sender = walletAddress
    const id = tx.uniqueId.toString()
    const l1NetworkID = l1.network.chainID.toString()

    let res, err

    setIsClaiming(true)

    try {
      if (tx.asset === 'eth') {
        res = await eth.triggerOutbox({
          id,
          l1Signer,
          txLifecycle: {
            onL1TxSubmit: ({ tx: l1tx, event }) => {
              transactions.addTransaction({
                status: 'pending',
                type: 'outbox',
                value: utils.formatEther(event.value),
                assetName: TokenSymbol.ETH,
                assetType: AssetType.ETH,
                sender,
                txID: l1tx.hash,
                l1NetworkID,
                l2ToL1MsgData: { uniqueId: getUniqueIdOrHashFromEvent(event) }
              })
            },
            onL1TxSuccess,
            onL1TxFailure
          }
        })
      } else {
        res = await token.triggerOutbox({
          id,
          l1Signer,
          txLifecycle: {
            onL1TxSubmit: ({ tx: l1tx, event }) => {
              transactions.addTransaction({
                status: 'pending',
                type: 'outbox',
                value: utils.formatUnits(event.value, event.decimals),
                assetName: event.symbol,
                assetType: AssetType.ERC20,
                sender,
                txID: l1tx.hash,
                l1NetworkID,
                l2ToL1MsgData: { uniqueId: getUniqueIdOrHashFromEvent(event) }
              })
            },
            onL1TxSuccess,
            onL1TxFailure
          }
        })
      }
    } catch (error: any) {
      err = error
      console.warn(err)
    } finally {
      setIsClaiming(false)
    }

    // Don't show any alert in case user denies the signature
    if (err?.code === 4001) {
      return
    }

    if (!res) {
      alert("Can't claim this withdrawal yet")
    }
  }

  return { claim, isClaiming }
}
