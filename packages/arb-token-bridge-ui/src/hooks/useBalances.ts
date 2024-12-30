import { Address, useAccount } from 'wagmi'
import { useMemo } from 'react'

import { useBalance } from './useBalance'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'
import { useArbQueryParams } from './useArbQueryParams'

export function useBalances({
  parentWalletAddress,
  childWalletAddress
}: {
  parentWalletAddress?: Address
  childWalletAddress?: Address
} = {}) {
  const [networks] = useNetworks()
  const { childChain, parentChain, isDepositMode, isTeleportMode } =
    useNetworksRelationship(networks)
  const { address: walletAddress } = useAccount()
  const [{ destinationAddress }] = useArbQueryParams()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress

  const isDepositOrTeleportMode = isDepositMode || isTeleportMode

  const _parentWalletAddress =
    parentWalletAddress ??
    (isDepositOrTeleportMode
      ? walletAddress
      : destinationAddressOrWalletAddress)

  const _childWalletAddress =
    childWalletAddress ??
    (isDepositOrTeleportMode
      ? destinationAddressOrWalletAddress
      : walletAddress)

  const {
    eth: [ethParentBalance, updateEthParentBalance],
    erc20: [erc20ParentBalances, updateErc20ParentBalances]
  } = useBalance({
    chainId: parentChain.id,
    walletAddress: _parentWalletAddress
  })

  const {
    eth: [ethChildBalance, updateEthChildBalance],
    erc20: [erc20ChildBalances, updateErc20ChildBalances]
  } = useBalance({
    chainId: childChain.id,
    walletAddress: _childWalletAddress
  })

  return useMemo(
    () => ({
      ethParentBalance,
      updateEthParentBalance,
      erc20ParentBalances,
      updateErc20ParentBalances,
      ethChildBalance,
      updateEthChildBalance,
      erc20ChildBalances,
      updateErc20ChildBalances
    }),
    [
      erc20ChildBalances,
      erc20ParentBalances,
      ethChildBalance,
      ethParentBalance,
      updateErc20ChildBalances,
      updateErc20ParentBalances,
      updateEthChildBalance,
      updateEthParentBalance
    ]
  )
}
