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
  const { childChain, parentChain, isDepositMode } =
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
    eth: [ethParentBalance, updateEthParentBalance],
    erc20: [erc20ParentBalances, updateErc20ParentBalances]
  } = useBalance({
    chainId: parentChain.id,
    walletAddress: _l1WalletAddress
  })

  const {
    eth: [ethChildBalance, updateEthChildBalance],
    erc20: [erc20ChildBalances, updateErc20ChildBalances]
  } = useBalance({
    chainId: childChain.id,
    walletAddress: _l2WalletAddress
  })

  return {
    ethParentBalance,
    updateEthParentBalance,
    erc20ParentBalances,
    updateErc20ParentBalances,
    ethChildBalance,
    updateEthChildBalance,
    erc20ChildBalances,
    updateErc20ChildBalances
  }
}
