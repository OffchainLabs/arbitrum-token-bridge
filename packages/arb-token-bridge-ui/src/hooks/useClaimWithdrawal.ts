import { useCallback, useState } from 'react'
import { useAccount } from 'wagmi'

import { useAppState } from '../state'
import { MergedTransaction, WithdrawalStatus } from '../state/app/state'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { errorToast } from '../components/common/atoms/Toast'
import { AssetType, L2ToL1EventResultPlus } from './arbTokenBridge.types'
import { setParentChainTxDetailsOfWithdrawalClaimTx } from '../components/TransactionHistory/helpers'
import { ChildTransactionReceipt } from '@arbitrum/sdk'
import { ContractReceipt, utils } from 'ethers'
import { useTransactionHistory } from './useTransactionHistory'
import dayjs from 'dayjs'
import { fetchErc20Data } from '../util/TokenUtils'
import { fetchNativeCurrency } from './useNativeCurrency'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { captureSentryErrorWithExtraData } from '../util/SentryUtils'
import { useTransactionHistoryAddressStore } from '../components/TransactionHistory/TransactionHistorySearchBar'
import { useEthersSigner } from '../util/wagmi/useEthersSigner'
import { useArbTokenBridge } from './useArbTokenBridge'

export type UseClaimWithdrawalResult = {
  claim: () => Promise<void>
  isClaiming: boolean
}

export function useClaimWithdrawal(
  tx: MergedTransaction
): UseClaimWithdrawalResult {
  const arbTokenBridge = useArbTokenBridge()
  const { address } = useAccount()
  const sanitizedAddress = useTransactionHistoryAddressStore(
    state => state.sanitizedAddress
  )
  const signer = useEthersSigner({ chainId: tx.parentChainId })
  const { updatePendingTransaction } = useTransactionHistory(
    sanitizedAddress ?? address
  )
  const [isClaiming, setIsClaiming] = useState(false)

  const claim = useCallback(async () => {
    if (isClaiming || !tx.isWithdrawal || tx.isCctp) {
      return
    }

    if (tx.uniqueId === null) {
      return errorToast("Can't find withdrawal transaction.")
    }

    let res, err: any

    setIsClaiming(true)

    const childChainProvider = getProviderForChainId(tx.childChainId)
    const txReceipt = await childChainProvider.getTransactionReceipt(tx.txId)
    const l2TxReceipt = new ChildTransactionReceipt(txReceipt)
    const [event] = l2TxReceipt.getChildToParentEvents()

    if (!event) {
      setIsClaiming(false)
      errorToast("Can't claim withdrawal: event not found.")
      return
    }

    const { symbol, decimals } =
      tx.assetType === AssetType.ERC20
        ? await fetchErc20Data({
            address: tx.tokenAddress as string,
            provider: getProviderForChainId(tx.parentChainId)
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

    captureSentryErrorWithExtraData({
      error: err,
      originFunction: 'useClaimWithdrawal claim'
    })
    if (!res) {
      errorToast(`Can't claim withdrawal: ${err?.message ?? err}`)
    }

    const isSuccess = (res as ContractReceipt).status === 1
    const txHash = (res as ContractReceipt).transactionHash

    await updatePendingTransaction({
      ...tx,
      status: isSuccess ? WithdrawalStatus.EXECUTED : WithdrawalStatus.FAILURE,
      resolvedAt: isSuccess ? dayjs().valueOf() : null
    })

    if (isSuccess) {
      setParentChainTxDetailsOfWithdrawalClaimTx(tx, txHash)
    }
  }, [
    arbTokenBridge.eth,
    arbTokenBridge.token,
    isClaiming,
    signer,
    tx,
    updatePendingTransaction
  ])

  return { claim, isClaiming }
}
