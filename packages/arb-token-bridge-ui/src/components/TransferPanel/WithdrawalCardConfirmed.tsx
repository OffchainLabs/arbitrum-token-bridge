import { useMemo, useState } from 'react'
import Tippy from '@tippyjs/react'

import { useAppState } from '../../state'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { MergedTransaction } from '../../state/app/state'
import { WithdrawalCardContainer, WithdrawalL2TxStatus } from './WithdrawalCard'

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
        <span>Please connect to the L1 network to claim your withdrawal.</span>
      }
    >
      <div className="w-max">{children}</div>
    </Tippy>
  )
}

export function WithdrawalCardConfirmed({ tx }: { tx: MergedTransaction }) {
  const { isConnectedToArbitrum } = useNetworksAndSigners()
  const {
    app: { arbTokenBridge }
  } = useAppState()

  const [isClaimingFunds, setIsClaimingFunds] = useState(false)

  const isClaimFundsButtonDisabled = useMemo(
    () =>
      typeof isConnectedToArbitrum !== 'undefined'
        ? isConnectedToArbitrum
        : true,
    [isConnectedToArbitrum]
  )

  async function claimFunds() {
    if (isClaimingFunds) {
      return
    }

    if (tx.uniqueId === null) {
      return
    }

    let res, err

    setIsClaimingFunds(true)

    try {
      if (tx.asset === 'eth') {
        res = await arbTokenBridge.eth.triggerOutbox(tx.uniqueId.toString())
      } else {
        res = await arbTokenBridge.token.triggerOutbox(tx.uniqueId.toString())
      }
    } catch (error: any) {
      err = error
      console.warn(err)
    } finally {
      setIsClaimingFunds(false)
    }

    // Don't show any alert in case user denies the signature
    if (err?.code === 4001) {
      return
    }

    if (!res) {
      // eslint-disable-next-line no-alert
      alert("Can't claim this withdrawal yet; try again later")
    }
  }

  return (
    <WithdrawalCardContainer tx={tx}>
      <span className="text-2xl text-v3-arbitrum-dark-blue">
        Funds are ready to claim!
      </span>

      <Tooltip show={isClaimFundsButtonDisabled}>
        <button
          className="arb-hover w-max rounded-lg bg-v3-dark px-4 py-3 text-2xl text-white disabled:bg-v3-gray-5"
          disabled={isClaimFundsButtonDisabled}
          onClick={claimFunds}
        >
          Claim {tx.value} {tx.asset.toUpperCase()}
        </button>
      </Tooltip>

      <div className="flex flex-col font-light">
        <span className="text-v3-arbitrum-dark-blue">
          L2 transaction: <WithdrawalL2TxStatus tx={tx} />
        </span>
        <span className="text-v3-arbitrum-dark-blue">
          L1 transaction: Will show after claiming
        </span>
      </div>
    </WithdrawalCardContainer>
  )
}
