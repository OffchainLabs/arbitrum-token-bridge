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
import {
  Balances,
  useSelectedTokenBalances
} from '../../hooks/TransferPanel/useSelectedTokenBalances'
import { useAppState } from '../../state'
import { useBalances } from '../../hooks/useBalances'
import { TransferReadinessRichErrorMessage } from './useTransferReadinessUtils'
import { ExternalLink } from '../common/ExternalLink'
import { useTransferDisabledDialogStore } from './TransferDisabledDialog'
import { formatAmount } from '../../util/NumberUtils'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { Loader } from '../common/atoms/Loader'
import { sanitizeAmountQueryParam } from '../../hooks/useArbQueryParams'
import { truncateExtraDecimals } from '../../util/NumberUtils'

function MaxButton({
  customFeeTokenBalances,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  customFeeTokenBalances: Balances
}) {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { isDepositMode, childChainProvider } =
    useNetworksRelationship(networks)

  const { ethParentBalance, ethChildBalance } = useBalances()
  const selectedTokenBalances = useSelectedTokenBalances()
  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const maxButtonVisible = useMemo(() => {
    const ethBalance = isDepositMode ? ethParentBalance : ethChildBalance
    const customFeeTokenBalance = isDepositMode
      ? customFeeTokenBalances.parentBalance
      : customFeeTokenBalances.childBalance
    const tokenBalance = isDepositMode
      ? selectedTokenBalances.parentBalance
      : selectedTokenBalances.childBalance

    if (selectedToken) {
      if (!tokenBalance) {
        return false
      }

      return !tokenBalance.isZero()
    }

    if (nativeCurrency.isCustom) {
      return customFeeTokenBalance && !customFeeTokenBalance.isZero()
    }

    if (!ethBalance) {
      return false
    }

    return !ethBalance.isZero()
  }, [
    isDepositMode,
    ethParentBalance,
    ethChildBalance,
    customFeeTokenBalances,
    selectedTokenBalances,
    selectedToken,
    nativeCurrency.isCustom
  ])

  if (!maxButtonVisible) {
    return null
  }

  return (
    <button
      type="button"
      className={twMerge(
        'rounded bg-white/30 px-1 py-0.5 text-right text-xs font-medium leading-none text-white opacity-80 transition-opacity hover:opacity-60',
        className
      )}
      {...rest}
    >
      MAX
    </button>
  )
}

function SourceChainTokenBalance({
  customFeeTokenBalances,
  balanceOverride
}: {
  customFeeTokenBalances: Balances
  balanceOverride?: AmountInputOptions['balance']
}) {
  const {
    app: { selectedToken }
  } = useAppState()
  const [networks] = useNetworks()
  const { isDepositMode, childChainProvider } =
    useNetworksRelationship(networks)

  const { ethParentBalance, ethChildBalance } = useBalances()
  const selectedTokenBalances = useSelectedTokenBalances()

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const tokenBalance = isDepositMode
    ? selectedTokenBalances.parentBalance
    : selectedTokenBalances.childBalance

  const ethBalance = isDepositMode ? ethParentBalance : ethChildBalance
  const customFeeTokenBalance = isDepositMode
    ? customFeeTokenBalances.parentBalance
    : customFeeTokenBalances.childBalance

  const nativeCurrencyBalance = nativeCurrency.isCustom
    ? customFeeTokenBalance
    : ethBalance

  const balance =
    balanceOverride ?? (selectedToken ? tokenBalance : nativeCurrencyBalance)

  const formattedBalance = balance
    ? formatAmount(balance, {
        decimals: selectedToken?.decimals ?? nativeCurrency.decimals
      })
    : null

  if (formattedBalance) {
    return (
      <>
        <span className="text-sm font-light text-white">Balance: </span>
        <span
          className="whitespace-nowrap text-sm text-white"
          aria-label={`${
            selectedToken?.symbol ?? nativeCurrency.symbol
          } balance amount on ${isDepositMode ? 'parentChain' : 'childChain'}`}
        >
          {formattedBalance}
        </span>
      </>
    )
  }

  return (
    <>
      <span className="text-sm font-light text-white">Balance: </span>
      <Loader wrapperClass="ml-1" color="white" size={12} />
    </>
  )
}

const TransferPanelInputField = React.memo(
  (props: React.InputHTMLAttributes<HTMLInputElement>) => {
    return (
      <input
        type="text"
        inputMode="decimal"
        placeholder="0"
        aria-label="Amount input"
        className="h-full w-full bg-transparent px-3 text-xl font-light text-white placeholder:text-gray-300 sm:text-3xl"
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

type AmountInputOptions = TokenButtonOptions & {
  balance?: number | undefined
}

export type TransferPanelMainInputProps =
  React.InputHTMLAttributes<HTMLInputElement> & {
    errorMessage?: string | TransferReadinessRichErrorMessage | undefined
    maxButtonOnClick: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick']
    value: string
    options?: AmountInputOptions
    customFeeTokenBalances: Balances
    maxAmount: string | undefined
    isMaxAmount: boolean
    decimals: number
  }

export const TransferPanelMainInput = React.memo(
  ({
    errorMessage,
    maxButtonOnClick,
    onChange,
    maxAmount,
    value,
    isMaxAmount,
    decimals,
    options,
    customFeeTokenBalances,
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
        setLocalValue(
          sanitizeAmountQueryParam(
            truncateExtraDecimals(e.target.value, decimals)
          )
        )
        onChange?.(e)
      },
      [decimals, onChange]
    )

    return (
      <>
        <div className={twMerge('flex flex-row rounded bg-black/40 shadow-2')}>
          <div
            className={twMerge(
              'flex grow flex-row items-center justify-center'
            )}
          >
            <TransferPanelInputField
              {...rest}
              value={localValue}
              onChange={handleInputChange}
            />
            <div className="flex flex-col items-end">
              <TokenButton options={options} />
              <div className="flex items-center space-x-1 px-3 pb-2 pt-1">
                <SourceChainTokenBalance
                  customFeeTokenBalances={customFeeTokenBalances}
                  balanceOverride={options?.balance}
                />
                <MaxButton
                  onClick={handleMaxButtonClick}
                  customFeeTokenBalances={customFeeTokenBalances}
                />
              </div>
            </div>
          </div>
        </div>

        <ErrorMessage errorMessage={errorMessage} />
      </>
    )
  }
)

TransferPanelMainInput.displayName = 'TransferPanelMainInput'
