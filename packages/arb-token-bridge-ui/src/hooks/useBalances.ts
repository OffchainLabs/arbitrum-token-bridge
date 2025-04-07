import { useAccount } from 'wagmi'
import { useMemo } from 'react'
import { useLatest } from 'react-use'
import useSWR from 'swr'

import { useBalance } from './useBalance'
import { useNetworks } from './useNetworks'
import { useNetworksRelationship } from './useNetworksRelationship'
import { useArbQueryParams } from './useArbQueryParams'
import { useAppState } from '../state'
import { getUSDCAddresses } from '../state/cctpState'

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
    erc20: [, updateErc20ParentBalances]
  } = useBalance({
    chainId: parentChain.id,
    walletAddress: parentWalletAddress
  })

  const {
    eth: [ethChildBalance, updateEthChildBalance],
    erc20: [, updateErc20ChildBalances]
  } = useBalance({
    chainId: childChain.id,
    walletAddress: childWalletAddress
  })

  const { data: erc20ParentBalances = {} } = useSWR(
    typeof bridgeTokens !== 'undefined'
      ? [
          parentWalletAddress,
          bridgeTokens,
          parentChain.id,
          'useBalances',
          'erc20'
        ]
      : null,
    ([_parentWalletAddress, _bridgeTokens, _parentChainId]) => {
      const parentAddresses = Object.keys(_bridgeTokens)
      const parentUsdcAddress = getUSDCAddresses(_parentChainId)?.USDC

      if (parentUsdcAddress && !_bridgeTokens[parentUsdcAddress]) {
        parentAddresses.push(parentUsdcAddress)
      }

      return updateErc20ParentBalances(parentAddresses)
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
    ([_parentWalletAddress, _bridgeTokens, _childChainId]) => {
      const childUsdcAddress = getUSDCAddresses(_childChainId)?.USDC
      const childUsdceAddress =
        getUSDCAddresses(_childChainId)?.[
          'USDC.e' as keyof ReturnType<typeof getUSDCAddresses>
        ]

      const definedAddresses = [childUsdcAddress, childUsdceAddress].filter(
        Boolean
      ) as string[]

      const childAddressesSet = new Set<string>(definedAddresses)

      Object.values(_bridgeTokens).forEach(token => {
        if (token?.l2Address) {
          childAddressesSet.add(token.l2Address)
        }
      })

      return updateErc20ChildBalances([...childAddressesSet])
    },
    {
      refreshInterval: 10_000
    }
  )

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
