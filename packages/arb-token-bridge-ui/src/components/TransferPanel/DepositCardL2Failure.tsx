import React, { useCallback, useMemo, useState } from 'react'
import { L1TransactionReceipt, L1ToL2MessageStatus } from '@arbitrum/sdk'
import Tippy from '@tippyjs/react'

import { useAppState } from '../../state'
import { MergedTransaction } from '../../state/app/state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { DepositCardContainer, DepositL1TxStatus } from './DepositCard'

type ButtonTooltipProps = {
  show: boolean
  children: React.ReactNode
}

function Tooltip(props: ButtonTooltipProps): JSX.Element {
  const { show, children } = props

  if (!show) {
    return <>{children}</>
  }

  return (
    <Tippy
      theme="light"
      content={
        <span>
          Please connect to the L2 network to re-execute your deposit.
        </span>
      }
    >
      <div className="w-max">{children}</div>
    </Tippy>
  )
}

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

  const redeemRetryable = useCallback(
    async (tx: MergedTransaction) => {
      setIsRedeemingRetryable(true)

      const l1Signer = l1.signer
      const l2Signer = l2.signer

      if (typeof l1Signer === 'undefined' || typeof l2Signer === 'undefined') {
        return
      }

      const retryableCreationTxID = tx.l1ToL2MsgData?.retryableCreationTxID

      if (!retryableCreationTxID) {
        throw new Error("Can't redeem; txid not found")
      }

      const l1TxReceipt = new L1TransactionReceipt(
        await l1Signer.provider.getTransactionReceipt(tx.txId)
      )

      const messages = await l1TxReceipt.getL1ToL2Messages(l2Signer)
      const l1ToL2Msg = messages.find(
        m => m.retryableCreationId === retryableCreationTxID
      )

      if (!l1ToL2Msg) {
        throw new Error("Can't redeem; message not found")
      }

      const res = await l1ToL2Msg.redeem()
      await res.wait()

      // update in store
      arbTokenBridge.transactions.fetchAndUpdateL1ToL2MsgStatus(
        tx.txId,
        l1ToL2Msg,
        tx.asset === 'eth',
        L1ToL2MessageStatus.REDEEMED
      )

      setIsRedeemingRetryable(false)
    },
    [arbTokenBridge, l1.signer, l2.signer]
  )

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
          <Tooltip show={isRedeemButtonDisabled}>
            <button
              className="arb-hover w-max rounded-lg bg-v3-dark px-4 py-3 text-2xl text-white disabled:bg-v3-gray-5"
              disabled={isRedeemButtonDisabled}
              onClick={() => redeemRetryable(tx)}
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
