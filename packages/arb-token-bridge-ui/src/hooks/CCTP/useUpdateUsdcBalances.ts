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

export async function childChainUsdcAddressFetcher([
  _parentChainUsdcAddress,
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

  const _parentChainProvider = getProviderForChainId(parentChainId)
  const _childChainProvider = getProviderForChainId(childChainId)

  return getL2ERC20Address({
    erc20L1Address: _parentChainUsdcAddress,
    l1Provider: _parentChainProvider,
    l2Provider: _childChainProvider
  })
}

export function useParentChainUsdcAddress() {
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

  const parentChainUsdcAddress = useParentChainUsdcAddress()

  // we don't have native USDC addresses for Orbit chains, we need to fetch it
  const {
    data: childChainUsdcAddress,
    error, // can be unbridged to Orbit chain so no address to be found
    isLoading
  } = useSWRImmutable(
    typeof parentChainUsdcAddress !== 'undefined'
      ? [
          parentChainUsdcAddress,
          parentChain.id,
          childChain.id,
          'fetchChildChainUsdcAddress'
        ]
      : null,
    childChainUsdcAddressFetcher
  )

  const updateUsdcBalances = useCallback(() => {
    // USDC is not native for the selected networks, do nothing
    if (!parentChainUsdcAddress) {
      return
    }

    if (isLoading) {
      return
    }

    updateErc20ParentBalance([parentChainUsdcAddress.toLowerCase()])

    if (childChainUsdcAddress) {
      updateErc20ChildBalance([childChainUsdcAddress.toLowerCase()])
    }
  }, [
    isLoading,
    childChainUsdcAddress,
    parentChainUsdcAddress,
    updateErc20ChildBalance,
    updateErc20ParentBalance
  ])

  return {
    updateUsdcBalances
  }
}
