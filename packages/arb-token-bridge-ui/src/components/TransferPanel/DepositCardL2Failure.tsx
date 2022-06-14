import { useMemo, useState } from 'react'
import { L1ToL2MessageStatus, IL1ToL2MessageWriter } from '@arbitrum/sdk'

import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { getRetryableTicket } from '../../util/RetryableUtils'
import { DepositCardContainer, DepositL1TxStatus } from './DepositCard'
import { Tooltip } from '../common/Tooltip'

export function DepositCardL2Failure({ tx }: { tx: MergedTransaction }) {
  const { l1, l2, isConnectedToArbitrum } = useNetworksAndSigners()
  const {
    app: { arbTokenBridge }
  } = useAppState()

  const [isRedeemingRetryable, setIsRedeemingRetryable] = useState(false)

  const isRedeemButtonDisabled = useMemo(
    () =>
      typeof isConnectedToArbitrum !== 'undefined'
        ? !isConnectedToArbitrum
        : true,
    [isConnectedToArbitrum]
  )

  async function redeemRetryable() {
    setIsRedeemingRetryable(true)

    const l1Signer = l1.signer
    const l2Signer = l2.signer

    if (typeof l1Signer === 'undefined' || typeof l2Signer === 'undefined') {
      return
    }

    let retryableTicket: IL1ToL2MessageWriter

    try {
      retryableTicket = await getRetryableTicket({
        l1TxHash: tx.txId,
        retryableCreationId: tx.l1ToL2MsgData?.retryableCreationTxID,
        l1Provider: l1Signer.provider,
        l2Signer
      })
    } catch (error: any) {
      return alert(error.message)
    }

    const res = await retryableTicket.redeem()
    await res.wait()

    // update in store
    arbTokenBridge.transactions.fetchAndUpdateL1ToL2MsgStatus(
      tx.txId,
      retryableTicket,
      tx.asset === 'eth',
      L1ToL2MessageStatus.REDEEMED
    )

    setIsRedeemingRetryable(false)
  }

  return (
    <DepositCardContainer tx={tx}>
      {isRedeemingRetryable ? (
        <>
          <span className="text-2xl text-v3-orange-dark">Re-executing...</span>
          <span className="text-4xl font-semibold text-v3-orange-dark">
            Almost there...
          </span>
        </>
      ) : (
        <>
          <span className="text-4xl font-semibold text-v3-orange-dark">
            L2 transaction failed
          </span>
          <Tooltip
            show={isRedeemButtonDisabled}
            content={
              <span>
                Please connect to the L2 network to re-execute your deposit.
              </span>
            }
          >
            <button
              className="arb-hover w-max rounded-lg bg-v3-dark px-4 py-3 text-2xl text-white disabled:bg-v3-gray-5"
              disabled={isRedeemButtonDisabled}
              onClick={redeemRetryable}
            >
              Re-execute
            </button>
          </Tooltip>
        </>
      )}
      <div className="flex flex-col font-light">
        <span className="text-lg text-v3-orange-dark">
          L1 transaction: <DepositL1TxStatus tx={tx} />
        </span>
        <span className="text-lg text-v3-orange-dark">
          L2 transaction:{' '}
          {isRedeemingRetryable ? 'Pending...' : 'Failed. Try re-executing.'}
        </span>
      </div>
    </DepositCardContainer>
  )
}
