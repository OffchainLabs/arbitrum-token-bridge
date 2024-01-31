import { Popover } from '@headlessui/react'
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import { twMerge } from 'tailwind-merge'
import { useMemo } from 'react'
import { GET_HELP_LINK } from '../../constants'
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal'
import { MergedTransaction } from '../../state/app/state'
import { useClaimCctp, useRemainingTime } from '../../state/cctpState'
import { trackEvent } from '../../util/AnalyticsUtils'
import { isUserRejectedError } from '../../util/isUserRejectedError'
import { getNetworkName } from '../../util/networks'
import { errorToast } from '../common/atoms/Toast'
import { Button } from '../common/Button'
import { Tooltip } from '../common/Tooltip'
import { useSwitchNetworkWithConfig } from '../../hooks/useSwitchNetworkWithConfig'
import { useNetwork } from 'wagmi'

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
  const { chain } = useNetwork()
  const { switchNetwork } = useSwitchNetworkWithConfig()
  const networkName = getNetworkName(chain?.id ?? 0)

  const { claim, isClaiming } = useClaimWithdrawal()
  const { claim: claimCctp, isClaiming: isClaimingCctp } = useClaimCctp(tx)
  const { isConfirmed } = useRemainingTime(tx)

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

  const getHelpOnError = () => {
    window.open(GET_HELP_LINK, '_blank')

    // track the button click
    trackEvent('Tx Error: Get Help Click', { network: networkName })
  }

  if (tx.status === 'Unconfirmed') {
    return (
      <Tooltip
        wrapperClassName=""
        content={<span>Funds aren&apos;t ready to claim yet</span>}
      >
        <Button variant="primary" disabled>
          Claim
        </Button>
      </Tooltip>
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
              tx.destinationChainId
            )} to claim your ${tx.isWithdrawal ? 'withdrawal' : 'deposit'}.`}
          </span>
        }
      >
        <Button
          variant="primary"
          loading={isClaiming || isClaimingCctp}
          disabled={isClaimButtonDisabled}
          className={twMerge(!currentChainIsValid && 'p-2 py-4 text-xs')}
          onClick={async () => {
            try {
              if (!currentChainIsValid) {
                return switchNetwork?.(tx.destinationChainId)
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
