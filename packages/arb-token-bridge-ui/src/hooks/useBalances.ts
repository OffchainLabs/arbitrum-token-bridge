import { Address, useAccount } from 'wagmi'
import { useMemo } from 'react'

import { useBalance } from './useBalance'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'
import { useArbQueryParams } from './useArbQueryParams'
import { getTransferMode } from '../util/getTransferMode'

export function useBalances({
  parentWalletAddress,
  childWalletAddress
}: {
  parentWalletAddress?: Address
  childWalletAddress?: Address
} = {}) {
  const [networks] = useNetworks()
  const { childChain, parentChain } = useNetworksRelationship(networks)
  const transferMode = getTransferMode({
    sourceChainId: networks.sourceChain.id,
    destinationChainId: networks.destinationChain.id
  })
  const { address: walletAddress } = useAccount()
  const [{ destinationAddress }] = useArbQueryParams()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress

  const _parentWalletAddress =
    parentWalletAddress ??
    (transferMode === 'deposit' || transferMode === 'teleport'
      ? walletAddress
      : destinationAddressOrWalletAddress)

  const _childWalletAddress =
    childWalletAddress ??
    (transferMode === 'deposit' || transferMode === 'teleport'
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
