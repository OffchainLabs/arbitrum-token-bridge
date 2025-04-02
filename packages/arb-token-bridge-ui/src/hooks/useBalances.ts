import { useAccount } from 'wagmi'
import { useMemo } from 'react'
import { useLatest } from 'react-use'
import useSWR from 'swr'

import { useBalance } from './useBalance'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'
import { useArbQueryParams } from './useArbQueryParams'
import { useAppState } from '../state'

export function useBalances() {
  const {
    app: { arbTokenBridge }
  } = useAppState()
  const {
    current: { bridgeTokens }
  } = useLatest(arbTokenBridge)
  const [networks] = useNetworks()
  const { childChain, parentChain, isDepositMode } =
    useNetworksRelationship(networks)
  const { address: walletAddress } = useAccount()
  const [{ destinationAddress }] = useArbQueryParams()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress
  const parentWalletAddress = isDepositMode
    ? walletAddress
    : destinationAddressOrWalletAddress

  const childWalletAddress = isDepositMode
    ? destinationAddressOrWalletAddress
    : walletAddress

  const {
    eth: [ethParentBalance, updateEthParentBalance],
    erc20: [_erc20ParentBalances, updateErc20ParentBalances]
  } = useBalance({
    chainId: parentChain.id,
    walletAddress: parentWalletAddress
  })

  const {
    eth: [ethChildBalance, updateEthChildBalance],
    erc20: [_erc20ChildBalances, updateErc20ChildBalances]
  } = useBalance({
    chainId: childChain.id,
    walletAddress: childWalletAddress
  })

  const { data: erc20ParentBalances = {} } = useSWR(
    typeof bridgeTokens !== 'undefined'
      ? [
          childWalletAddress,
          bridgeTokens,
          parentChain.id,
          'useBalances',
          'erc20'
        ]
      : null,
    ([_parentWalletAddress, _bridgeTokens]) => {
      const parentAddresses = Object.keys(_bridgeTokens)

      updateErc20ChildBalances(parentAddresses)

      return _erc20ParentBalances
    },
    {
      refreshInterval: 10_000
    }
  )

  const { data: erc20ChildBalances = {} } = useSWR(
    typeof bridgeTokens !== 'undefined'
      ? [
          childWalletAddress,
          bridgeTokens,
          childChain.id,
          'useBalances',
          'erc20'
        ]
      : null,
    ([_parentWalletAddress, _bridgeTokens]) => {
      const childAddresses = Object.values(_bridgeTokens)
        .map(t => t?.l2Address)
        .filter(Boolean) as string[]

      updateErc20ChildBalances(childAddresses)

      return _erc20ChildBalances
    },
    {
      refreshInterval: 10_000
    }
  )

  return useMemo(
    () => ({
      ethParentBalance,
      updateEthParentBalance,
      erc20ParentBalances: erc20ParentBalances || {},
      updateErc20ParentBalances,
      ethChildBalance,
      updateEthChildBalance,
      erc20ChildBalances: erc20ChildBalances || {},
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
