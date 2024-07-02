import { Address, useAccount } from 'wagmi'

import { useBalance } from './useBalance'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'

import { useDestinationAddressStore } from '../components/TransferPanel/AdvancedSettings'

export function useBalances({
  l1WalletAddress,
  l2WalletAddress
}: {
  l1WalletAddress?: Address
  l2WalletAddress?: Address
} = {}) {
  const [networks] = useNetworks()
  const { childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const { address: walletAddress } = useAccount()
  const { destinationAddress } = useDestinationAddressStore()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress

  const _l1WalletAddress =
    l1WalletAddress ??
    (isDepositMode ? walletAddress : destinationAddressOrWalletAddress)

  const _l2WalletAddress =
    l2WalletAddress ??
    (isDepositMode ? destinationAddressOrWalletAddress : walletAddress)

  const {
    eth: [ethL1Balance, updateEthL1Balance],
    erc20: [erc20L1Balances, updateErc20L1Balances]
  } = useBalance({
    provider: parentChainProvider,
    walletAddress: _l1WalletAddress
  })

  const {
    eth: [ethL2Balance, updateEthL2Balance],
    erc20: [erc20L2Balances, updateErc20L2Balances]
  } = useBalance({
    provider: childChainProvider,
    walletAddress: _l2WalletAddress
  })

  return {
    ethL1Balance,
    updateEthL1Balance,
    erc20L1Balances,
    updateErc20L1Balances,
    ethL2Balance,
    updateEthL2Balance,
    erc20L2Balances,
    updateErc20L2Balances
  }
}
