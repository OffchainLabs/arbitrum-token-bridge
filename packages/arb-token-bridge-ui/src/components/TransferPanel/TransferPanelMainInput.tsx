import { twMerge } from 'tailwind-merge'
import { useAccount } from 'wagmi'
import { useEffect, useMemo } from 'react'

import { Loader } from '../common/atoms/Loader'
import { TokenButton } from './TokenButton'
import { useNetworks } from '../../hooks/useNetworks'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useDestinationAddressStore } from './AdvancedSettings'
import { useBalance } from '../../hooks/useBalance'
import { useSelectedTokenBalances } from '../../hooks/TransferPanel/useSelectedTokenBalances'
import { useSetInputAmount } from '../../hooks/TransferPanel/useSetInputAmount'
import { countDecimals } from '../../util/NumberUtils'
import { useSelectedTokenDecimals } from '../../hooks/TransferPanel/useSelectedTokenDecimals'
import { useSelectedToken } from '../../hooks/useSelectedToken'

type MaxButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading: boolean
}

function MaxButton(props: MaxButtonProps) {
  const { loading, className = '', ...rest } = props

  const [selectedToken] = useSelectedToken()
  const { address: walletAddress } = useAccount()
  const [networks] = useNetworks()
  const { childChain, parentChain, isDepositMode } =
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
    chainId: parentChain.id,
    walletAddress: l1WalletAddress
  })
  const {
    eth: [ethL2Balance]
  } = useBalance({
    chainId: childChain.id,
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

function TransferPanelInputField(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  const { value = '', onChange, ...rest } = props
  const setAmount = useSetInputAmount()
  const decimals = useSelectedTokenDecimals()

  useEffect(() => {
    // if number of decimals of query param value is greater than token decimals,
    // truncate the decimals and update the amount query param value
    if (countDecimals(String(value)) > decimals) {
      setAmount(String(value))
    }
  }, [value, decimals, setAmount])

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder="Enter amount"
      className="h-full w-full bg-transparent px-3 text-xl font-light placeholder:text-gray-dark sm:text-3xl"
      value={value}
      onChange={event => {
        onChange?.(event)
        setAmount(event.target.value)
      }}
      {...rest}
    />
  )
}

export type TransferPanelMainInputProps =
  React.InputHTMLAttributes<HTMLInputElement> & {
    errorMessage?: string | React.ReactNode
    maxButtonProps: MaxButtonProps
    value: string
  }

export function TransferPanelMainInput(props: TransferPanelMainInputProps) {
  const { errorMessage, maxButtonProps, ...rest } = props

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
          <TransferPanelInputField {...rest} />
          <MaxButton {...maxButtonProps} />
        </div>
      </div>

      {typeof errorMessage !== 'undefined' && (
        <span className="text-sm text-brick">{errorMessage}</span>
      )}
    </>
  )
}
