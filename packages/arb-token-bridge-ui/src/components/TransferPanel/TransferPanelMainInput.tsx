import React, {
  ChangeEventHandler,
  useCallback,
  useEffect,
  useState
} from 'react'
import { twMerge } from 'tailwind-merge'
import { useMemo } from 'react'

import { TokenButton, TokenButtonOptions } from './TokenButton'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useSelectedTokenBalances } from '../../hooks/TransferPanel/useSelectedTokenBalances'
import { useAppState } from '../../state'
import { useBalances } from '../../hooks/useBalances'
import { TransferReadinessRichErrorMessage } from './useTransferReadinessUtils'
import { ExternalLink } from '../common/ExternalLink'
import { useTransferDisabledDialogStore } from './TransferDisabledDialog'
import { sanitizeAmountQueryParam } from '../../hooks/useArbQueryParams'

function MaxButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props

  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)

  const { ethParentBalance, ethChildBalance } = useBalances()
  const selectedTokenBalances = useSelectedTokenBalances()

  const maxButtonVisible = useMemo(() => {
    const ethBalance = isDepositMode ? ethParentBalance : ethChildBalance
    const tokenBalance = isDepositMode
      ? selectedTokenBalances.parentBalance
      : selectedTokenBalances.childBalance

    if (selectedToken) {
      if (!tokenBalance) {
        return false
      }

      return !tokenBalance.isZero()
    }

    if (!ethBalance) {
      return false
    }

    return !ethBalance.isZero()
  }, [
    ethParentBalance,
    ethChildBalance,
    selectedTokenBalances,
    selectedToken,
    isDepositMode
  ])

  if (!maxButtonVisible) {
    return null
  }

  return (
    <button
      type="button"
      className={twMerge(
        'arb-hover px-2 py-2 text-sm font-light text-gray-6 sm:px-4',
        className
      )}
      {...rest}
    >
      MAX
    </button>
  )
}

const TransferPanelInputField = React.memo(
  (props: React.InputHTMLAttributes<HTMLInputElement>) => {
    return (
      <input
        type="text"
        inputMode="decimal"
        placeholder="Enter amount"
        className="h-full w-full bg-transparent px-3 text-xl font-light placeholder:text-gray-dark sm:text-3xl"
        {...props}
      />
    )
  }
)

TransferPanelInputField.displayName = 'TransferPanelInputField'

function ErrorMessage({
  errorMessage
}: {
  errorMessage: string | TransferReadinessRichErrorMessage | undefined
}) {
  const { openDialog: openTransferDisabledDialog } =
    useTransferDisabledDialogStore()

  if (typeof errorMessage === 'undefined') {
    return null
  }

  if (typeof errorMessage === 'string') {
    return <span className="text-sm text-brick">{errorMessage}</span>
  }

  switch (errorMessage) {
    case TransferReadinessRichErrorMessage.GAS_ESTIMATION_FAILURE:
      return (
        <span className="text-sm text-brick">
          Gas estimation failed, join our{' '}
          <ExternalLink
            href="https://discord.com/invite/ZpZuw7p"
            className="underline"
          >
            Discord
          </ExternalLink>{' '}
          and reach out in #support for assistance.
        </span>
      )

    case TransferReadinessRichErrorMessage.TOKEN_WITHDRAW_ONLY:
    case TransferReadinessRichErrorMessage.TOKEN_TRANSFER_DISABLED:
      return (
        <>
          <span className="text-sm text-brick">
            This token can&apos;t be bridged over.
          </span>{' '}
          <button
            className="arb-hover underline"
            onClick={openTransferDisabledDialog}
          >
            Learn more.
          </button>
        </>
      )
  }
}

export type TransferPanelMainInputProps =
  React.InputHTMLAttributes<HTMLInputElement> & {
    errorMessage?: string | TransferReadinessRichErrorMessage | undefined
    maxButtonOnClick: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick']
    value: string
    tokenButtonOptions?: TokenButtonOptions
    maxAmount: string | undefined
    isMaxAmount: boolean
  }

export const TransferPanelMainInput = React.memo(
  ({
      errorMessage,
      maxButtonOnClick,
      tokenButtonOptions,
      onChange,
      maxAmount,
      value,
      isMaxAmount,
      ...rest
    }: TransferPanelMainInputProps) => {
    const [localValue, setLocalValue] = useState(value)

    useEffect(() => {
      if (!isMaxAmount || !maxAmount) {
        return
      }

      /**
       * On first render, maxAmount is not defined, once we receive max amount value, we set the localValue
       * If user types anything before we receive the amount, isMaxAmount is set to false in the parent
       */
      setLocalValue(maxAmount)
    }, [isMaxAmount, maxAmount])

    const handleMaxButtonClick: React.MouseEventHandler<HTMLButtonElement> =
      useCallback(
        e => {
          maxButtonOnClick?.(e)
          if (maxAmount) {
            setLocalValue(maxAmount)
          }
        },
        [maxAmount, maxButtonOnClick]
      )

    const handleInputChange: ChangeEventHandler<HTMLInputElement> = useCallback(
      e => {
        setLocalValue(sanitizeAmountQueryParam(e.target.value))
        onChange?.(e)
      },
      [onChange]
    )

    return (
      <>
        <div
          className={twMerge(
            'flex flex-row rounded border bg-black/40 shadow-2',
            errorMessage
              ? 'border-brick text-brick'
              : 'border-white/30 text-white'
          )}
        >
          <TokenButton options={tokenButtonOptions} />
          <div
            className={twMerge(
              'flex grow flex-row items-center justify-center border-l',
              errorMessage ? 'border-brick' : 'border-white/30'
            )}
          >
            <TransferPanelInputField
              {...rest}
              value={localValue}
              onChange={handleInputChange}
            />
            <MaxButton onClick={handleMaxButtonClick} />
          </div>
        </div>

        <ErrorMessage errorMessage={errorMessage} />
      </>
    )
  }
)

TransferPanelMainInput.displayName = 'TransferPanelMainInput'
