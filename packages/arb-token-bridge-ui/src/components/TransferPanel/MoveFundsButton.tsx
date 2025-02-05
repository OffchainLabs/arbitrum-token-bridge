import { useCallback } from 'react'
import { twMerge } from 'tailwind-merge'
import { useAccount, useWalletClient } from 'wagmi'

import { Button } from '../common/Button'
import { useTransferReadiness } from './useTransferReadiness'
import { useNetworksRelationship } from '../../hooks/useNetworksRelationship'
import { useNetworks } from '../../hooks/useNetworks'
import { useAppContextState } from '../App/AppContext'

export function MoveFundsButton({ onClick }: { onClick: () => void }) {
  const {
    layout: { isTransferring }
  } = useAppContextState()
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const { isConnected } = useAccount()
  const { data: walletClient, isLoading: isWalletLoading } = useWalletClient()

  const { transferReady, errorMessages } = useTransferReadiness()

  const isButtonEnabled = isDepositMode
    ? transferReady.deposit
    : transferReady.withdrawal

  const isWalletReady = isConnected && !!walletClient && !isWalletLoading

  const handleClick = useCallback(() => {
    console.log('[Debug] MoveFundsButton clicked', {
      transferReady,
      errorMessages,
      isTransferring,
      isDepositMode,
      isConnected,
      walletClient: !!walletClient,
      isWalletLoading,
      isWalletReady
    })
    onClick()
  }, [
    onClick,
    transferReady,
    errorMessages,
    isTransferring,
    isDepositMode,
    isConnected,
    walletClient,
    isWalletLoading,
    isWalletReady
  ])

  if (!isConnected) {
    return (
      <Button
        variant="primary"
        className="w-full"
        onClick={() => {
          // This will trigger the wallet connect modal
          window.ethereum?.request({ method: 'eth_requestAccounts' })
        }}
      >
        Connect Wallet
      </Button>
    )
  }

  if (!isWalletReady) {
    return (
      <Button variant="primary" className="w-full" disabled={true}>
        Connecting Wallet...
      </Button>
    )
  }

  return (
    <Button
      variant="primary"
      className={twMerge(
        'mt-6 w-full',
        !isButtonEnabled && 'cursor-not-allowed opacity-50'
      )}
      disabled={!isButtonEnabled || isTransferring}
      loading={isTransferring}
      onClick={handleClick}
    >
      {isTransferring
        ? 'Moving funds...'
        : isDepositMode
        ? 'Deposit'
        : 'Withdraw'}
    </Button>
  )
}
