import { useState } from 'react'
import { AssetType, getUniqueIdOrHashFromEvent } from 'token-bridge-sdk'
import { utils } from 'ethers'

import { useAppState } from '../state'
import { MergedTransaction } from '../state/app/state'
import { useNetworksAndSigners } from './useNetworksAndSigners'

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

  async function claim(tx: MergedTransaction) {
    if (isClaiming) {
      return
    }

    if (tx.uniqueId === null) {
      return alert("Can't find withdrawal")
    }

    let res, err

    setIsClaiming(true)

    try {
      if (tx.asset === 'eth') {
        res = await eth.triggerOutbox({
          id: tx.uniqueId.toString(),
          l1Signer,
          txLifecycle: {
            onTxSubmit: (tx, event) => {
              transactions.addTransaction({
                status: 'pending',
                type: 'outbox',
                value: utils.formatEther(event.value),
                assetName: 'ETH',
                assetType: AssetType.ETH,
                sender: walletAddress,
                txID: tx.hash,
                l1NetworkID: l1.network.chainID.toString(),
                l2ToL1MsgData: { uniqueId: getUniqueIdOrHashFromEvent(event) }
              })
            },
            onTxSuccess: txHash => {
              transactions.setTransactionSuccess(txHash)
            },
            onTxFailure: txHash => {
              transactions.setTransactionFailure(txHash)
            }
          }
        })
      } else {
        res = await token.triggerOutbox({
          id: tx.uniqueId.toString(),
          l1Signer,
          txLifecycle: {
            onTxSubmit: (tx, event, tokenData) => {
              transactions.addTransaction({
                status: 'pending',
                type: 'outbox',
                value: utils.formatUnits(event.value, tokenData.decimals),
                assetName: tokenData.symbol,
                assetType: AssetType.ERC20,
                sender: walletAddress,
                txID: tx.hash,
                l1NetworkID: l1.network.chainID.toString(),
                l2ToL1MsgData: { uniqueId: getUniqueIdOrHashFromEvent(event) }
              })
            },
            onTxSuccess: txHash => {
              transactions.setTransactionSuccess(txHash)
            },
            onTxFailure: txHash => {
              transactions.setTransactionFailure(txHash)
            }
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
