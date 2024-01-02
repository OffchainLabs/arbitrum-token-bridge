import { useState } from 'react'
import * as Sentry from '@sentry/react'
import { useAccount, useSigner } from 'wagmi'

import { useAppState } from '../state'
import { MergedTransaction, WithdrawalStatus } from '../state/app/state'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { errorToast } from '../components/common/atoms/Toast'
import { AssetType, L2ToL1EventResultPlus } from './arbTokenBridge.types'
import {
  getProvider,
  setParentChainTxDetailsOfWithdrawalClaimTx
} from '../components/TransactionHistory/helpers'
import { L2TransactionReceipt } from '@arbitrum/sdk'
import { ContractReceipt, utils } from 'ethers'
import { useTransactionHistory } from './useTransactionHistory'
import dayjs from 'dayjs'
import { fetchErc20Data } from '../util/TokenUtils'
import { fetchNativeCurrency } from './useNativeCurrency'

export type UseClaimWithdrawalResult = {
  claim: (tx: MergedTransaction) => Promise<void>
  isClaiming: boolean
}

export function useClaimWithdrawal(): UseClaimWithdrawalResult {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const { address } = useAccount()
  const { data: signer } = useSigner()
  const { updatePendingTransaction } = useTransactionHistory(address)
  const [isClaiming, setIsClaiming] = useState(false)

  async function claim(tx: MergedTransaction) {
    if (isClaiming || !tx.isWithdrawal || tx.isCctp) {
      return
    }

    if (tx.uniqueId === null) {
      return errorToast("Can't find withdrawal transaction.")
    }

    let res, err

    setIsClaiming(true)

    const childChainProvider = getProvider(tx.childChainId)
    const txReceipt = await childChainProvider.getTransactionReceipt(tx.txId)
    const l2TxReceipt = new L2TransactionReceipt(txReceipt)
    const [event] = l2TxReceipt.getL2ToL1Events()

    if (!event) {
      setIsClaiming(false)
      errorToast("Can't claim withdrawal: event not found.")
      return
    }

    const { symbol, decimals } =
      tx.assetType === AssetType.ERC20
        ? await fetchErc20Data({
            address: tx.tokenAddress as string,
            provider: getProvider(tx.parentChainId)
          })
        : await fetchNativeCurrency({ provider: childChainProvider })

    const extendedEvent: L2ToL1EventResultPlus = {
      ...event,
      sender: tx.sender,
      destinationAddress: tx.destination,
      l2TxHash: tx.txId,
      type: tx.assetType,
      value: utils.parseEther(tx.value ?? '0'),
      tokenAddress: tx.tokenAddress || undefined,
      outgoingMessageState: 1,
      symbol,
      decimals,
      nodeBlockDeadline: tx.nodeBlockDeadline,
      parentChainId: tx.parentChainId,
      childChainId: tx.childChainId
    }

    try {
      if (!signer) {
        throw 'Signer is undefined'
      }
      if (tx.assetType === AssetType.ETH) {
        res = await arbTokenBridge.eth.triggerOutbox({
          event: extendedEvent,
          l1Signer: signer
        })
      } else {
        res = await arbTokenBridge.token.triggerOutbox({
          event: extendedEvent,
          l1Signer: signer
        })
      }
    } catch (error: any) {
      err = error
    } finally {
      setIsClaiming(false)
    }

    // Don't show any alert / log any error in case user denies the signature
    if (isUserRejectedError(err)) {
      return
    }

    Sentry.captureException(err)
    if (!res) {
      errorToast(`Can't claim withdrawal: ${err?.message ?? err}`)
    }

    const isSuccess = (res as ContractReceipt).status === 1
    const txHash = (res as ContractReceipt).transactionHash

    updatePendingTransaction({
      ...tx,
      status: isSuccess ? WithdrawalStatus.EXECUTED : WithdrawalStatus.FAILURE,
      resolvedAt: isSuccess ? dayjs().valueOf() : null
    })

    if (isSuccess) {
      setParentChainTxDetailsOfWithdrawalClaimTx(tx, txHash)
    }
  }

  return { claim, isClaiming }
}
