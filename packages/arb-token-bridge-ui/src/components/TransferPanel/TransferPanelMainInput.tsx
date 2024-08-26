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
import { getNetworkName } from '../../util/networks'

function MaxButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    customFeeTokenBalances: Balances
  }
) {
  const { customFeeTokenBalances, className = '', ...rest } = props

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
      return (
        customFeeTokenBalances.parentBalance &&
        !customFeeTokenBalances.parentBalance.isZero()
      )
    }

    if (!ethBalance) {
      return false
    }

    return !ethBalance.isZero()
  }, [
    isDepositMode,
    ethParentBalance,
    ethChildBalance,
    selectedTokenBalances.parentBalance,
    selectedTokenBalances.childBalance,
    selectedToken,
    nativeCurrency.isCustom,
    customFeeTokenBalances.parentBalance
  ])

  if (!maxButtonVisible) {
    return null
  }

  return (
    <button
      type="button"
      className={twMerge(
        'arb-hover text-right text-xs font-bold text-gray-6',
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

  const networkName = getNetworkName(networks.sourceChain.id)

  const { ethParentBalance, ethChildBalance } = useBalances()
  const selectedTokenBalances = useSelectedTokenBalances()

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  const tokenBalance = isDepositMode
    ? selectedTokenBalances.parentBalance
    : selectedTokenBalances.childBalance

  const ethBalance = isDepositMode ? ethParentBalance : ethChildBalance

  const nativeCurrencyBalance = nativeCurrency.isCustom
    ? customFeeTokenBalances.parentBalance
    : ethBalance
  const balance =
    balanceOverride ?? (selectedToken ? tokenBalance : nativeCurrencyBalance)

  const formattedBalance = balance
    ? formatAmount(balance, {
        decimals: selectedToken?.decimals ?? nativeCurrency.decimals
      })
    : null

  return (
    <>
      {formattedBalance ? (
        <>
          <span className="text-xs font-light">Balance: </span>
          <span
            className="text-xs"
            aria-label={`${
              selectedToken?.symbol ?? nativeCurrency.symbol
            } balance amount on ${networkName}`}
          >
            {formattedBalance}
          </span>
        </>
      ) : (
        <Loader wrapperClass="ml-1" color="white" size={12} />
      )}
    </>
  )
}

function TransferPanelInputField(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  const { value = '', ...rest } = props

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

export function TransferPanelMainInput(props: TransferPanelMainInputProps) {
  const {
    errorMessage,
    maxButtonOnClick,
    overrides,
    customFeeTokenBalances,
    ...rest
  } = props

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
