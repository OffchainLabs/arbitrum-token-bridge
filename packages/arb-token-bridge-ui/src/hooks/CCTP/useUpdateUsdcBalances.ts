import { useCallback, useMemo } from 'react'
import { isAddress } from 'ethers/lib/utils.js'
import { Address } from 'wagmi'
import useSWRImmutable from 'swr/immutable'

import { CommonAddress } from '../../util/CommonAddressUtils'
import { getL2ERC20Address } from '../../util/TokenUtils'
import { useNetworks } from '../useNetworks'
import { useNetworksRelationship } from '../useNetworksRelationship'
import { isNetwork } from '../../util/networks'
import { useBalances } from '../useBalances'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'

export async function getChildUsdcAddress([
  _parentUsdcAddress,
  parentChainId,
  childChainId
]: [Address, number, number]) {
  const {
    isEthereumMainnet: isParentEthereumMainnet,
    isSepolia: isParentSepolia
  } = isNetwork(parentChainId)

  if (isParentEthereumMainnet) {
    return CommonAddress.ArbitrumOne.USDC
  }

  if (isParentSepolia) {
    return CommonAddress.ArbitrumSepolia.USDC
  }

  const _parentProvider = getProviderForChainId(parentChainId)
  const _childProvider = getProviderForChainId(childChainId)

  return getL2ERC20Address({
    erc20L1Address: _parentUsdcAddress,
    l1Provider: _parentProvider,
    l2Provider: _childProvider
  })
}

export function useParentUsdcAddress() {
  const [networks] = useNetworks()
  const { parentChain } = useNetworksRelationship(networks)

  return useMemo(() => {
    const {
      isEthereumMainnet: isParentEthereumMainnet,
      isSepolia: isParentSepolia,
      isArbitrumOne: isParentArbitrumOne,
      isArbitrumSepolia: isParentArbitrumSepolia
    } = isNetwork(parentChain.id)

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
  }, [parentChain.id])
}

export function useUpdateUsdcBalances({
  walletAddress
}: {
  walletAddress: string | undefined
}) {
  const [networks] = useNetworks()
  const { parentChain, childChain } = useNetworksRelationship(networks)

  const _walletAddress: Address | undefined =
    walletAddress && isAddress(walletAddress) ? walletAddress : undefined
  const {
    updateErc20ParentBalances: updateErc20ParentBalance,
    updateErc20ChildBalances: updateErc20ChildBalance
  } = useBalances({
    parentWalletAddress: _walletAddress,
    childWalletAddress: _walletAddress
  })

  const parentUsdcAddress = useParentUsdcAddress()

  // we don't have native USDC addresses for Orbit chains, we need to fetch it
  const {
    data: childUsdcAddress,
    error, // can be unbridged to Orbit chain so no address to be found
    isLoading
  } = useSWRImmutable(
    typeof parentUsdcAddress !== 'undefined'
      ? [
          parentUsdcAddress,
          parentChain.id,
          childChain.id,
          'getChildUsdcAddress'
        ]
      : null,
    getChildUsdcAddress
  )

  const updateUsdcBalances = useCallback(() => {
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
  }, [
    isLoading,
    childUsdcAddress,
    parentUsdcAddress,
    updateErc20ChildBalance,
    updateErc20ParentBalance
  ])

  return {
    updateUsdcBalances
  }
}
