import { Popover } from '@headlessui/react'
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import { twMerge } from 'tailwind-merge'
import { useMemo } from 'react'
import { GET_HELP_LINK } from '../../constants'
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { DepositStatus, MergedTransaction } from '../../state/app/state'
import { useClaimCctp, useRemainingTime } from '../../state/cctpState'
import { shouldTrackAnalytics, trackEvent } from '../../util/AnalyticsUtils'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { getNetworkName } from '../../util/networks'
import { errorToast } from '../common/atoms/Toast'
import { Button } from '../common/Button'
import { Tooltip } from '../common/Tooltip'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useNetwork } from 'wagmi'
import { isDepositReadyToRedeem } from '../../state/app/utils'
import { useIsConnectedToArbitrum } from '../../hooks/useIsConnectedToArbitrum'
import { useRedeemRetryable } from '../../hooks/useRedeemRetryable'
import { WithdrawalCountdown } from '../common/WithdrawalCountdown'
import { DepositCountdown } from '../common/DepositCountdown'

const GetHelpButton = ({
  variant,
  onClick
}: {
  variant: 'primary' | 'secondary'
  onClick: () => void
}) => {
  return (
    <Button
      variant={variant}
      onClick={onClick}
      className={variant === 'secondary' ? 'bg-white px-4 py-3' : ''}
    >
      Get Help
    </Button>
  )
}

export function TransactionsTableRowAction({
  tx,
  isError,
  type
}: {
  tx: MergedTransaction
  isError: boolean
  type: 'deposits' | 'withdrawals'
}) {
  const {
    l1: { network: l1Network },
    l2: { network: l2Network }
  } = useNetworksAndSigners()
  const { switchNetwork } = useSwitchNetworkWithConfig()
  const l1NetworkName = getNetworkName(l1Network.id)
  const l2NetworkName = getNetworkName(l2Network.id)
  const networkName = type === 'deposits' ? l1NetworkName : l2NetworkName

  const { chain } = useNetwork()
  const { claim, isClaiming } = useClaimWithdrawal()
  const { claim: claimCctp, isClaiming: isClaimingCctp } = useClaimCctp(tx)
  const { isConfirmed } = useRemainingTime(tx)
  const isConnectedToArbitrum = useIsConnectedToArbitrum()
  const { redeem, isRedeeming } = useRedeemRetryable()
  const { remainingTime: cctpRemainingTime } = useRemainingTime(tx)

  const currentChainIsValid = useMemo(() => {
    if (!chain) {
      return false
    }
    if (type === 'deposits') {
      return chain.id === tx.childChainId
    }
    return chain.id === tx.parentChainId
  }, [type, chain, tx.parentChainId, tx.childChainId])

  const isClaimButtonDisabled = useMemo(() => {
    return isClaiming || isClaimingCctp || !isConfirmed
  }, [isClaiming, isClaimingCctp, isConfirmed])

  const isRedeemButtonDisabled = useMemo(
    () =>
      typeof isConnectedToArbitrum !== 'undefined'
        ? !isConnectedToArbitrum
        : true,
    [isConnectedToArbitrum]
  )

  const getHelpOnError = () => {
    window.open(GET_HELP_LINK, '_blank')

    // track the button click
    if (shouldTrackAnalytics(networkName)) {
      trackEvent('Tx Error: Get Help Click', { network: networkName })
    }
  }

  if (isDepositReadyToRedeem(tx)) {
    // Failed retryable
    return (
      <Tooltip
        show={isRedeemButtonDisabled}
        wrapperClassName=""
        content={
          <span>
            Please connect to the L2 network to re-execute your deposit. You
            have 7 days to re-execute a failed tx. After that, the tx is no
            longer recoverable.
          </span>
        }
      >
        <Button
          variant="primary"
          loading={isRedeeming}
          disabled={isRedeemButtonDisabled}
          onClick={() => redeem(tx)}
          className="bg-red-400 p-2 text-xs"
        >
          Retry
        </Button>
      </Tooltip>
    )
  }

  if (
    tx.status === 'Unconfirmed' ||
    tx.depositStatus === DepositStatus.L1_PENDING ||
    tx.depositStatus === DepositStatus.L2_PENDING ||
    typeof cctpRemainingTime !== 'undefined'
  ) {
    // TODO: Change to time remaining
    return (
      <div className="flex flex-col text-center text-[10px]">
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

    return (
      <Tooltip
        show={!currentChainIsValid}
        wrapperClassName=""
        content={
          <span>
            {`Please switch to ${getNetworkName(
              tx.isWithdrawal ? tx.parentChainId : tx.childChainId
            )} to claim your ${tx.isWithdrawal ? 'withdrawal' : 'deposit'}.`}
          </span>
        }
      >
        <Button
          variant="primary"
          loading={isClaiming || isClaimingCctp}
          disabled={isClaimButtonDisabled}
          className={twMerge(
            'p-2 text-xs',
            currentChainIsValid
              ? 'bg-green-400 text-black'
              : 'border border-white text-white'
          )}
          onClick={async () => {
            try {
              if (!currentChainIsValid) {
                return switchNetwork?.(
                  tx.isWithdrawal ? tx.parentChainId : tx.childChainId
                )
              }
              if (tx.isCctp) {
                return await claimCctp()
              } else {
                return await claim(tx)
              }
            } catch (error: any) {
              if (isUserRejectedError(error)) {
                return
              }

              errorToast(
                `Can't claim ${
                  type === 'deposits' ? 'withdrawal' : 'deposit'
                }: ${error?.message ?? error}`
              )
            }
          }}
        >
          {currentChainIsValid ? 'Claim' : 'Switch Network'}
        </Button>
      </Tooltip>
    )
  }

  if (isError) {
    const isTxOlderThan7Days = dayjs().diff(dayjs(tx.createdAt), 'days') > 7

    return (
      <>
        {isTxOlderThan7Days ? (
          // show a dropdown menu with the button
          <Popover>
            <Popover.Button>
              <EllipsisVerticalIcon className="h-6 w-6 cursor-pointer p-1 text-dark" />
            </Popover.Button>
            <Popover.Panel
              className={'absolute top-4 z-50 rounded-md bg-white shadow-lg'}
            >
              <GetHelpButton variant="secondary" onClick={getHelpOnError} />
            </Popover.Panel>
          </Popover>
        ) : (
          // show a normal button outside
          <GetHelpButton variant="primary" onClick={getHelpOnError} />
        )}
      </>
    )
  }

  return null
}
