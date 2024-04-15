import { useMemo } from 'react'

import { Balances } from '../../../hooks/TransferPanel/useSelectedTokenBalances'
import { useNativeCurrency } from '../../../hooks/useNativeCurrency'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useNetworks } from '../../../hooks/useNetworks'
import { useAccount } from 'wagmi'
import { useDestinationAddressStore } from '../AdvancedSettings'
import { useBalance } from '../../../hooks/useBalance'

export function useBalances() {
  const [networks] = useNetworks()
  const { childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const { address: walletAddress } = useAccount()
  const { destinationAddress } = useDestinationAddressStore()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress

  const l1WalletAddress = isDepositMode
    ? walletAddress
    : destinationAddressOrWalletAddress

  const l2WalletAddress = isDepositMode
    ? destinationAddressOrWalletAddress
    : walletAddress

  const {
    eth: [ethL1Balance],
    erc20: [erc20L1Balances]
  } = useBalance({
    provider: parentChainProvider,
    walletAddress: l1WalletAddress
  })

  const {
    eth: [ethL2Balance],
    erc20: [erc20L2Balances]
  } = useBalance({
    provider: childChainProvider,
    walletAddress: l2WalletAddress
  })

  return {
    ethL1Balance,
    erc20L1Balances,
    ethL2Balance,
    erc20L2Balances
  }
}

export function useCustomFeeTokenBalances(): Balances {
  const [networks] = useNetworks()
  const { childChainProvider } = useNetworksRelationship(networks)

  const { ethL1Balance, erc20L1Balances, ethL2Balance } = useBalances()

  const nativeCurrency = useNativeCurrency({ provider: childChainProvider })

  return useMemo(() => {
    if (!nativeCurrency.isCustom) {
      return { l1: ethL1Balance, l2: ethL2Balance }
    }

    return {
      l1: erc20L1Balances?.[nativeCurrency.address] ?? null,
      l2: ethL2Balance
    }
  }, [nativeCurrency, ethL1Balance, ethL2Balance, erc20L1Balances])
}
