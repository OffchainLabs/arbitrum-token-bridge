import { twMerge } from 'tailwind-merge'
import { useAccount } from 'wagmi'
import { useMemo } from 'react'

import { Loader } from '../common/atoms/Loader'
import { TokenButton } from './TokenButton'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useDestinationAddressStore } from './AdvancedSettings'
import { useBalance } from '../../hooks/useBalance'
import { useSelectedTokenBalances } from '../../hooks/TransferPanel/useSelectedTokenBalances'
import { useAppState } from '../../state'

type MaxButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading: boolean
}

function MaxButton(props: MaxButtonProps) {
  const { loading, className = '', ...rest } = props

  const {
    app: { selectedToken }
  } = useAppState()
  const { address: walletAddress } = useAccount()
  const [networks] = useNetworks()
  const { childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)

  const { destinationAddress } = useDestinationAddressStore()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress

  const l1WalletAddress = isDepositMode
    ? walletAddress
    : destinationAddressOrWalletAddress

  const l2WalletAddress = isDepositMode
    ? destinationAddressOrWalletAddress
    : walletAddress

  const {
    eth: [ethL1Balance]
  } = useBalance({
    provider: parentChainProvider,
    walletAddress: l1WalletAddress
  })
  const {
    eth: [ethL2Balance]
  } = useBalance({
    provider: childChainProvider,
    walletAddress: l2WalletAddress
  })
  const selectedTokenBalances = useSelectedTokenBalances()

  const maxButtonVisible = useMemo(() => {
    const ethBalance = isDepositMode ? ethL1Balance : ethL2Balance
    const tokenBalance = isDepositMode
      ? selectedTokenBalances.l1
      : selectedTokenBalances.l2

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
    ethL1Balance,
    ethL2Balance,
    selectedTokenBalances,
    selectedToken,
    isDepositMode
  ])

  if (!maxButtonVisible) {
    return null
  }

  if (loading) {
    return (
      <div className="px-4">
        <Loader color="#999999" size="small" />
      </div>
    )
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

export type TransferPanelMainInputProps =
  React.InputHTMLAttributes<HTMLInputElement> & {
    errorMessage?: string | React.ReactNode
    maxButtonProps: MaxButtonProps
    value: string
  }

export function TransferPanelMainInput(props: TransferPanelMainInputProps) {
  const { errorMessage, maxButtonProps, value, ...rest } = props

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
        <TokenButton />
        <div
          className={twMerge(
            'flex grow flex-row items-center justify-center border-l',
            errorMessage ? 'border-brick' : 'border-white/30'
          )}
        >
          <input
            type="text"
            inputMode="decimal"
            placeholder="Enter amount"
            className="h-full w-full bg-transparent px-3 text-xl font-light placeholder:text-gray-dark sm:text-3xl"
            value={value}
            {...rest}
          />
          <MaxButton {...maxButtonProps} />
        </div>
      </div>

      {typeof errorMessage !== 'undefined' && (
        <span className="text-sm text-brick">{errorMessage}</span>
      )}
    </>
  )
}
