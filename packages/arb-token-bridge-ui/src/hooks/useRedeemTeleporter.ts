import { useCallback, useState } from 'react'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'
import { useSigner } from 'wagmi'
import dayjs from 'dayjs'
import { TransactionReceipt } from '@ethersproject/providers'
import { DepositStatus, MergedTransaction } from '../state/app/state'
import {
  firstRetryableRequiresRedeem,
  getChainIdForRedeemingRetryable,
  getRetryableTicket
} from '../util/RetryableUtils'
import { trackEvent } from '../util/AnalyticsUtils'
import { getNetworkName } from '../util/networks'
import { isUserRejectedError } from '../util/isUserRejectedError'
import { errorToast } from '../components/common/atoms/Toast'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { useTransactionHistory } from './useTransactionHistory'
import { Address } from '../util/AddressUtils'
import { L1ToL2MessageData, L2ToL3MessageData } from './useTransactions'

export type UseRedeemRetryableResult = {
  redeem: () => Promise<void>
  isRedeeming: boolean
}

export function useRedeemTeleporter(
  tx: MergedTransaction,
  address: Address | undefined
): UseRedeemRetryableResult {
  const { data: signer } = useSigner({
    chainId: getChainIdForRedeemingRetryable(tx)
  })
  const { updatePendingTransaction } = useTransactionHistory(address)

  const redeemerNetworkName = getNetworkName(
    getChainIdForRedeemingRetryable(tx)
  )

  const [isRedeeming, setIsRedeeming] = useState(false)

  const redeem = useCallback(async () => {
    if (isRedeeming) {
      return
    }
    try {
      setIsRedeeming(true)

      if (!signer) {
        throw 'Signer is undefined'
      }

      // 1. first check which leg of the tx needs redeeming - l1toL2 or l2tol3
      // 2. then, ensure that the user is connected to the proper providers and signers
      // 3. then, we can call the same redeem logic we have on any of the Retryables and update the tx accordingly

      const isFirstRetryableBeingRedeemed = firstRetryableRequiresRedeem(tx)

      let sourceChainTxHash, retryableCreationId, sourceChainProvider

      if (isFirstRetryableBeingRedeemed) {
        sourceChainTxHash = tx.txId
        retryableCreationId = tx.l1ToL2MsgData?.retryableCreationTxID
        sourceChainProvider = getProviderForChainId(tx.parentChainId)
      } else {
        if (tx.l2ToL3MsgData) {
          sourceChainTxHash = tx.l1ToL2MsgData?.l2TxID
          retryableCreationId = tx.l2ToL3MsgData.retryableCreationTxID
          sourceChainProvider = getProviderForChainId(
            tx.l2ToL3MsgData.l2ChainId
          )
        }
      }

      if (!sourceChainTxHash || !sourceChainProvider) {
        throw 'Could not find redemption details'
      }

      const retryableTicket = await getRetryableTicket({
        sourceChainTxHash,
        retryableCreationId,
        sourceChainProvider,
        destinationChainSigner: signer
      })

      const reedemTx = await retryableTicket.redeem({ gasLimit: 40_000_000 }) // after a few trials, this gas limit seems to be working fine
      await reedemTx.wait()

      const status = await retryableTicket.status()
      const isSuccess = status === L1ToL2MessageStatus.REDEEMED

      if (!isSuccess) {
        console.error('Redemption failed; status is not REDEEMED', reedemTx)
        throw new Error(
          'Redemption failed; status is not REDEEMED. Please try again later.'
        )
      }

      const redeemReceipt = (await retryableTicket.getSuccessfulRedeem()) as {
        status: L1ToL2MessageStatus.REDEEMED
        l2TxReceipt: TransactionReceipt
      }

      const updatesInTx = isFirstRetryableBeingRedeemed
        ? {
            l1ToL2MsgData: {
              ...tx.l1ToL2MsgData,
              l2TxID: redeemReceipt.l2TxReceipt.transactionHash,
              status,
              retryableCreationTxID: retryableTicket.retryableCreationId,
              fetchingUpdate: false
            } as L1ToL2MessageData,
            l2ToL3MsgData: {
              ...tx.l2ToL3MsgData,
              status: L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2, // 2nd retryable needs to be manually redeemed
              fetchingUpdate: false
            } as L2ToL3MessageData,
            depositStatus: DepositStatus.L2_PENDING
          }
        : {
            l2ToL3MsgData: {
              ...tx.l2ToL3MsgData,
              l3TxID: redeemReceipt.l2TxReceipt.transactionHash,
              status,
              retryableCreationTxID: retryableTicket.retryableCreationId,
              fetchingUpdate: false
            } as L2ToL3MessageData,
            depositStatus: DepositStatus.L2_SUCCESS, // 2nd retryable redeemed, full success
            resolvedAt: dayjs().valueOf()
          }

      await updatePendingTransaction({
        // we need to use `await` here so that we get next retryable data fetched before updating the tx
        ...tx,
        ...updatesInTx
      })

      // track in analytics
      trackEvent('Redeem Retryable', { network: redeemerNetworkName })
    } catch (error: any) {
      if (isUserRejectedError(error)) {
        return
      }
      return errorToast(
        `There was an error, here is more information: ${error.message}`
      )
    } finally {
      setIsRedeeming(false)
    }
  }, [isRedeeming, redeemerNetworkName, signer, tx, updatePendingTransaction])

  return { redeem, isRedeeming }
}
