import { twMerge } from 'tailwind-merge'
import { useMemo } from 'react'

import { TokenButton, TokenButtonOverrides } from './TokenButton'
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

function TokenBalance({
  customFeeTokenBalances,
  balanceOverride
}: {
  customFeeTokenBalances: Balances
  balanceOverride?: AmountInputOverrides['balance']
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

  return <Loader wrapperClass="ml-1" color="white" size={12} />
}

function TransferPanelInputField({
  value = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder="Enter amount"
      className="h-full w-full bg-transparent px-3 text-xl font-light text-white placeholder:text-gray-300 sm:text-3xl"
      value={value}
      {...rest}
    />
  )
}

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

type AmountInputOverrides = TokenButtonOverrides & {
  balance?: number | undefined
}

export type TransferPanelMainInputProps =
  React.InputHTMLAttributes<HTMLInputElement> & {
    errorMessage?: string | TransferReadinessRichErrorMessage | undefined
    maxButtonOnClick: React.ButtonHTMLAttributes<HTMLButtonElement>['onClick']
    value: string
    overrides?: AmountInputOverrides
    customFeeTokenBalances: Balances
  }

export function TransferPanelMainInput({
  errorMessage,
  maxButtonOnClick,
  overrides,
  customFeeTokenBalances,
  ...rest
}: TransferPanelMainInputProps) {
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
        <div
          className={twMerge(
            'flex grow flex-row items-center justify-center',
            errorMessage ? 'border-brick' : 'border-white/30'
          )}
        >
          <TransferPanelInputField {...rest} />
          <div className="flex flex-col items-end">
            <TokenButton overrides={overrides} />
            <div className="flex items-center space-x-1 px-3 pb-2 pt-1">
              <TokenBalance
                customFeeTokenBalances={customFeeTokenBalances}
                balanceOverride={overrides?.balance}
              />
              <MaxButton
                onClick={maxButtonOnClick}
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
