import { Address } from 'viem'
import { useAccount } from 'wagmi'
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
  const { childChain, parentChain, isDepositMode } =
    useNetworksRelationship(networks)
  const { address: walletAddress } = useAccount()
  const [{ destinationAddress }] = useArbQueryParams()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress

  const _parentWalletAddress =
    parentWalletAddress ??
    (isDepositMode ? walletAddress : destinationAddressOrWalletAddress)

  const _childWalletAddress =
    childWalletAddress ??
    (isDepositMode ? destinationAddressOrWalletAddress : walletAddress)

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
