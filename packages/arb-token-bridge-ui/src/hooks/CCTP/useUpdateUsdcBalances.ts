import { useCallback } from 'react'
import { Address } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { CommonAddress } from '../../util/CommonAddressUtils'
import { getL2ERC20Address } from '../../util/TokenUtils'
import { useNetworks } from '../useNetworks'
import { useNetworksRelationship } from '../useNetworksRelationship'
import { isNetwork } from '../../util/networks'
import { useBalances } from '../useBalances'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

export async function getChildUsdcAddress({
  parentChainId,
  childChainId
}: {
  parentChainId: number
  childChainId: number
}) {
  const {
    isEthereumMainnet: isParentEthereumMainnet,
    isSepolia: isParentSepolia
  } = isNetwork(parentChainId)
  const {
    isArbitrumOne: isChildArbitrumOne,
    isArbitrumSepolia: isChildArbitrumSepolia
  } = isNetwork(childChainId)

  if (isParentEthereumMainnet && isChildArbitrumOne) {
    return CommonAddress.ArbitrumOne.USDC
  }

  if (isParentSepolia && isChildArbitrumSepolia) {
    return CommonAddress.ArbitrumSepolia.USDC
  }

  const parentUsdcAddress = getParentUsdcAddress(parentChainId)
  const parentProvider = getProviderForChainId(parentChainId)
  const childProvider = getProviderForChainId(childChainId)

  if (!parentUsdcAddress) {
    return
  }

  return getL2ERC20Address({
    erc20L1Address: parentUsdcAddress,
    l1Provider: parentProvider,
    l2Provider: childProvider
  })
}

export function getParentUsdcAddress(parentChainId: number) {
  const {
    isEthereumMainnet: isParentEthereumMainnet,
    isSepolia: isParentSepolia,
    isArbitrumOne: isParentArbitrumOne,
    isArbitrumSepolia: isParentArbitrumSepolia
  } = isNetwork(parentChainId)

  if (isParentEthereumMainnet) {
    return CommonAddress.Ethereum.USDC
  }

  if (isParentSepolia) {
    return CommonAddress.Sepolia.USDC
  }

  if (isParentArbitrumOne) {
    return CommonAddress.ArbitrumOne.USDC
  }

  if (isParentArbitrumSepolia) {
    return CommonAddress.ArbitrumSepolia.USDC
  }
}

export function useUpdateUsdcBalances({
  walletAddress
}: {
  walletAddress: Address | undefined
}) {
  const [networks] = useNetworks()
  const { parentChain, childChain } = useNetworksRelationship(networks)

  const {
    updateErc20ParentBalances: updateErc20ParentBalance,
    updateErc20ChildBalances: updateErc20ChildBalance
  } = useBalances({
    parentWalletAddress: walletAddress,
    childWalletAddress: walletAddress
  })

  // we don't have native USDC addresses for Orbit chains, we need to fetch it
  const { data: childUsdcAddress, isLoading } = useSWRImmutable(
    [parentChain.id, childChain.id, 'getChildUsdcAddress'],
    ([parentChainId, childChainId]) =>
      getChildUsdcAddress({
        parentChainId,
        childChainId
      })
  )

  const updateUsdcBalances = useCallback(() => {
    const parentUsdcAddress = getParentUsdcAddress(parentChain.id)

    const {
      isEthereumMainnet: isParentEthereumMainnet,
      isSepolia: isParentSepolia
    } = isNetwork(parentChain.id)

    // USDC is not native for the selected networks, do nothing
    if (!parentUsdcAddress) {
      return
    }

    if (isLoading) {
      return
    }

    updateErc20ParentBalance([parentUsdcAddress.toLowerCase()])

    if (childUsdcAddress) {
      updateErc20ChildBalance([childUsdcAddress.toLowerCase()])
    }

    if (isParentEthereumMainnet) {
      updateErc20ChildBalance([CommonAddress.ArbitrumOne['USDC.e']])
    }

    if (isParentSepolia) {
      updateErc20ChildBalance([CommonAddress.ArbitrumSepolia['USDC.e']])
    }
  }, [
    isLoading,
    childUsdcAddress,
    parentChain.id,
    updateErc20ChildBalance,
    updateErc20ParentBalance
  ])

  return {
    updateUsdcBalances
  }
}
