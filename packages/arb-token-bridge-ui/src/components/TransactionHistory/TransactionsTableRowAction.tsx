import { useCallback } from 'react'
import { GET_HELP_LINK } from '../../constants'
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { useClaimCctp, useRemainingTime } from '../../state/cctpState'
import { trackEvent } from '../../util/AnalyticsUtils'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { getNetworkName } from '../../util/networks'
import { errorToast } from '../common/atoms/Toast'
import { Button } from '../common/Button'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useNetwork } from 'wagmi'
import { isDepositReadyToRedeem } from '../../state/app/utils'
import { useRedeemRetryable } from '../../hooks/useRedeemRetryable'
import { WithdrawalCountdown } from '../common/WithdrawalCountdown'
import { DepositCountdown } from '../common/DepositCountdown'
import { Address } from '../../util/AddressUtils'

export function TransactionsTableRowAction({
  tx,
  isError,
  type,
  address
}: {
  tx: MergedTransaction
  isError: boolean
  type: 'deposits' | 'withdrawals'
  address: Address | undefined
}) {
  const { chain } = useNetwork()
  const { switchNetworkAsync } = useSwitchNetworkWithConfig()
  const networkName = getNetworkName(chain?.id ?? 0)

  const { claim, isClaiming } = useClaimWithdrawal(tx)
  const { claim: claimCctp, isClaiming: isClaimingCctp } = useClaimCctp(tx)
  const { redeem, isRedeeming } = useRedeemRetryable(tx, address)
  const { remainingTime: cctpRemainingTime } = useRemainingTime(tx)

  const isConnectedToCorrectNetworkForAction =
    chain?.id === tx.destinationChainId

  const handleRedeemRetryable = useCallback(async () => {
    try {
      if (!isConnectedToCorrectNetworkForAction) {
        await switchNetworkAsync?.(tx.destinationChainId)
      }
      await redeem()
    } catch (error: any) {
      if (isUserRejectedError(error)) {
        return
      }

      errorToast(`Can't retry the deposit: ${error?.message ?? error}`)
    }
  }, [
    isConnectedToCorrectNetworkForAction,
    redeem,
    switchNetworkAsync,
    tx.destinationChainId
  ])

  const handleClaim = useCallback(async () => {
    try {
      if (!isConnectedToCorrectNetworkForAction) {
        await switchNetworkAsync?.(tx.destinationChainId)
      }

      if (tx.isCctp) {
        return await claimCctp()
      } else {
        return await claim()
      }
    } catch (error: any) {
      if (isUserRejectedError(error)) {
        return
      }

      errorToast(
        `Can't claim ${type === 'deposits' ? 'withdrawal' : 'deposit'}: ${
          error?.message ?? error
        }`
      )
    }
  }, [
    claim,
    claimCctp,
    isConnectedToCorrectNetworkForAction,
    switchNetworkAsync,
    tx,
    type
  ])

  const getHelpOnError = () => {
    window.open(GET_HELP_LINK, '_blank')

    // track the button click
    trackEvent('Tx Error: Get Help Click', { network: networkName })
  }

  if (isDepositReadyToRedeem(tx)) {
    // Failed retryable
    return isRedeeming ? (
      <span className="animate-pulse">Retrying...</span>
    ) : (
      <Button
        variant="primary"
        onClick={handleRedeemRetryable}
        className="w-14 bg-red-400 p-2 text-xs text-black"
      >
        Retry
      </Button>
    )
  }

  if (
    tx.status === 'pending' ||
    tx.status === 'Unconfirmed' ||
    tx.depositStatus === DepositStatus.L1_PENDING ||
    tx.depositStatus === DepositStatus.L2_PENDING
  ) {
    return (
      <div className="flex flex-col text-center text-xs">
        <span>Time left:</span>
        {tx.isCctp && <>{cctpRemainingTime}</>}
        {!tx.isCctp &&
          (tx.isWithdrawal ? (
            <WithdrawalCountdown tx={tx} />
          ) : (
            <DepositCountdown tx={tx} />
          ))}
      </div>
    )
  }

  if (tx.status === 'Confirmed') {
    if (tx.isCctp && tx.resolvedAt) {
      return null
    }

    return isClaiming || isClaimingCctp ? (
      <span className="my-2 animate-pulse text-xs">Claiming...</span>
    ) : (
      <Button
        variant="primary"
        className="w-14 rounded bg-green-400 p-2 text-xs text-black"
        onClick={handleClaim}
      >
        Claim
      </Button>
    )
  }

  if (isError) {
    return (
      <Button
        variant="secondary"
        className="w-14 border-white/30 text-xs"
        onClick={getHelpOnError}
      >
        Get help
      </Button>
    )
  }

  return null
}
