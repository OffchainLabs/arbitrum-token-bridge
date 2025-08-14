import React, {
  ChangeEventHandler,
  useCallback,
  useEffect,
  useState,
  useMemo
} from 'react'
import { twMerge } from 'tailwind-merge'
import { useAccount } from 'wagmi'

import { TokenButton, TokenButtonOptions } from './TokenButton'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useSelectedTokenBalances } from '../../hooks/TransferPanel/useSelectedTokenBalances'
import { useSelectedToken } from '../../hooks/useSelectedToken'
import { TransferReadinessRichErrorMessage } from './useTransferReadinessUtils'
import { ExternalLink } from '../common/ExternalLink'
import { formatAmount } from '../../util/NumberUtils'
import { useNativeCurrency } from '../../hooks/useNativeCurrency'
import { Loader } from '../common/atoms/Loader'
import { sanitizeAmountQueryParam } from '../../hooks/useArbQueryParams'
import { truncateExtraDecimals } from '../../util/NumberUtils'
import { useNativeCurrencyBalances } from './TransferPanelMain/useNativeCurrencyBalances'
import { useSelectedTokenDecimals } from '../../hooks/TransferPanel/useSelectedTokenDecimals'
import { useMode } from '../../hooks/useMode'
import { addressesEqual } from '../../util/AddressUtils'
import { constants } from 'ethers'
import { Button } from '../common/Button'

function MaxButton({
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [selectedToken] = useSelectedToken()

  const selectedTokenBalances = useSelectedTokenBalances()
  const nativeCurrencyBalances = useNativeCurrencyBalances()

  const maxButtonVisible = useMemo(() => {
    const nativeCurrencySourceBalance = nativeCurrencyBalances.sourceBalance

    const tokenBalance = selectedTokenBalances.sourceBalance

    if (selectedToken) {
      return tokenBalance && !tokenBalance.isZero()
    }

    return nativeCurrencySourceBalance && !nativeCurrencySourceBalance.isZero()
  }, [
    nativeCurrencyBalances.sourceBalance,
    selectedTokenBalances.sourceBalance,
    selectedToken
  ])

  if (!maxButtonVisible) {
    return null
  }

  return (
    <Button variant="secondary" className={className} {...rest}>
      MAX
    </Button>
  )
}

function SourceChainTokenBalance({
  balanceOverride,
  symbolOverride
}: {
  balanceOverride?: AmountInputOptions['balance']
  symbolOverride?: AmountInputOptions['symbol']
}) {
  const [selectedToken] = useSelectedToken()
  const [networks] = useNetworks()
  const { isDepositMode, childChainProvider } =
    useNetworksRelationship(networks)
  const selectedTokenDecimals = useSelectedTokenDecimals()

  const nativeCurrencyBalances = useNativeCurrencyBalances()
  const selectedTokenBalances = useSelectedTokenBalances()

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  /**
   * If token is ETH (lifi), show ETH balance on source chain
   * If token is ERC20, show the balance of the selected token
   * If no token is selected, show the child chain native currency balance on source chain
   */
  const tokenBalance = (() => {
    if (addressesEqual(selectedToken?.address, constants.AddressZero)) {
      return selectedTokenBalances.sourceBalance
    }

    if (!selectedToken) {
      return nativeCurrencyBalances.sourceBalance
    }

    return selectedTokenBalances.sourceBalance
  })()

  const balance =
    balanceOverride ??
    (selectedToken ? tokenBalance : nativeCurrencyBalances.sourceBalance)

  const formattedBalance =
    balance !== null
      ? formatAmount(balance, {
          decimals: selectedTokenDecimals
        })
      : null

  const symbol =
    symbolOverride ?? selectedToken?.symbol ?? nativeCurrency.symbol

  if (formattedBalance) {
    return (
      <>
        <span className="text-sm font-light text-white/70">Balance: </span>
        <span
          className="whitespace-nowrap text-sm text-white/70"
          aria-label={`${symbol} balance amount on ${
            isDepositMode ? 'parentChain' : 'childChain'
          }`}
        >
          {formattedBalance}
        </span>
      </>
    )
  }

  return (
    <>
      <span className="text-sm font-light text-white/70">Balance: </span>
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
  const { embedMode } = useMode()

  if (typeof errorMessage === 'undefined') {
    return null
  }

  if (typeof errorMessage === 'string') {
    return (
      <span className={twMerge('text-sm text-brick', embedMode && 'text-xs')}>
        {errorMessage}
      </span>
    )
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
        <div className="text-sm text-brick">
          <span>This token can&apos;t be bridged over.</span>
        </div>
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
    ...rest
  }: TransferPanelMainInputProps) => {
    const { isConnected } = useAccount()
    const [localValue, setLocalValue] = useState(value)
    const selectedTokenDecimals = useSelectedTokenDecimals()
    const sanitizedAmount = sanitizeAmountQueryParam(
      truncateExtraDecimals(value, selectedTokenDecimals)
    )

    useEffect(() => {
      /**
       * If value is empty, set localValue to empty string
       * this is useful when transfer was successful and the `amount` query param
       * was reset to an empty string
       */
      if (value === '') {
        setLocalValue('')
      }

      if (!isMaxAmount || !maxAmount) {
        return
      }

      /**
       * On first render, maxAmount is not defined, once we receive max amount value, we set the localValue
       * If user types anything before we receive the amount, isMaxAmount is set to false in the parent
       */
      setLocalValue(maxAmount)
    }, [isMaxAmount, maxAmount, value])

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

    useEffect(() => {
      if (value !== sanitizedAmount) {
        setLocalValue(sanitizedAmount)
      }
    }, [sanitizedAmount, value])

    return (
      <>
        <div className="flex flex-row rounded bg-white/10">
          <div
            className={twMerge(
              'flex min-h-[96px] grow flex-row items-center justify-center'
            )}
          >
            <TransferPanelInputField
              {...rest}
              value={localValue}
              onChange={handleInputChange}
            />
            <div className="flex flex-col items-end gap-[10px] px-[15px]">
              <TokenButton options={options} />
              {isConnected && (
                <div className="flex items-center space-x-1">
                  <SourceChainTokenBalance
                    balanceOverride={options?.balance}
                    symbolOverride={options?.symbol}
                  />
                  <MaxButton
                    className="rounded-sm px-[8px] py-[2px] text-[10px]"
                    onClick={handleMaxButtonClick}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <ErrorMessage errorMessage={errorMessage} />
      </>
    )
  }
)

TransferPanelMainInput.displayName = 'TransferPanelMainInput'
