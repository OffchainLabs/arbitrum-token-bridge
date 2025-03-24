import { useCallback } from 'react'
import { utils } from 'ethers'
import useSWRImmutable from 'swr/immutable'
import { Provider } from '@ethersproject/providers'
import {
  getChainIdFromProvider,
  getProviderForChainId
} from '@/token-bridge-sdk/utils'

import { ERC20BridgeToken, TokenType } from './arbTokenBridge.types'
import {
  getL2ERC20Address,
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC,
  isTokenMainnetUSDC,
  isTokenNativeUSDC,
  isTokenSepoliaUSDC
} from '../util/TokenUtils'
import { useNetworks } from './useNetworks'
import { isNetwork } from '../util/networks'
import { CommonAddress } from '../util/CommonAddressUtils'
import { useNetworksRelationship } from './useNetworksRelationship'
import {
  useTokensFromLists,
  useTokensFromUser
} from '../components/TransferPanel/TokenSearchUtils'
import { useArbQueryParams } from './useArbQueryParams'

const commonUSDC = {
  name: 'USD Coin',
  type: TokenType.ERC20,
  symbol: 'USDC',
  decimals: 6,
  listIds: new Set<string>()
}

export const useSelectedToken = () => {
  const [{ token: tokenFromSearchParams }, setQueryParams] = useArbQueryParams()
  const [networks] = useNetworks()
  const { childChain, parentChain } = useNetworksRelationship(networks)
  const tokensFromLists = useTokensFromLists()
  const tokensFromUser = useTokensFromUser()

  const { data: usdcToken } = useSWRImmutable(
    [
      tokenFromSearchParams,
      parentChain.id,
      childChain.id,
      'useSelectedToken_usdc'
    ],
    async ([_tokenAddress, _parentChainId, _childChainId]) => {
      if (!_tokenAddress) {
        return null
      }

      if (!isTokenNativeUSDC(_tokenAddress)) {
        return null
      }

      const parentProvider = getProviderForChainId(_parentChainId)
      const childProvider = getProviderForChainId(_childChainId)

      return getUsdcToken({
        tokenAddress: _tokenAddress,
        parentProvider,
        childProvider
      })
    }
  )

  const setSelectedToken = useCallback(
    (erc20ParentAddress: string | null) =>
      setQueryParams({ token: sanitizeTokenAddress(erc20ParentAddress) }),
    [setQueryParams]
  )

  if (!tokenFromSearchParams) {
    return [null, setSelectedToken] as const
  }

  return [
    usdcToken ||
    tokensFromUser[tokenFromSearchParams] ||
      tokensFromLists[tokenFromSearchParams] ||
      null,
    setSelectedToken
  ] as const
}

function sanitizeTokenAddress(tokenAddress: string | null): string | undefined {
  if (!tokenAddress) {
    return undefined
  }
  if (utils.isAddress(tokenAddress)) {
    return tokenAddress
  }
  return undefined
}

export async function getUsdcToken({
  tokenAddress,
  parentProvider,
  childProvider
}: {
  tokenAddress: string
  parentProvider: Provider
  childProvider: Provider
}): Promise<ERC20BridgeToken | null> {
  const parentChainId = await getChainIdFromProvider(parentProvider)
  const childChainId = await getChainIdFromProvider(childProvider)

  const {
    isEthereumMainnet: isParentChainEthereumMainnet,
    isSepolia: isParentChainSepolia,
    isArbitrumOne: isParentChainArbitrumOne,
    isArbitrumSepolia: isParentChainArbitrumSepolia
  } = isNetwork(parentChainId)

  console.log({ tokenAddress })
  // Ethereum Mainnet USDC
  if (isTokenMainnetUSDC(tokenAddress) && isParentChainEthereumMainnet) {
    console.log('token 1')
    return {
      ...commonUSDC,
      address: CommonAddress.Ethereum.USDC,
      l2Address: CommonAddress.ArbitrumOne['USDC.e']
    }
  }

  // Ethereum Sepolia USDC
  if (isTokenSepoliaUSDC(tokenAddress) && isParentChainSepolia) {
    return {
      ...commonUSDC,
      address: CommonAddress.Sepolia.USDC,
      l2Address: CommonAddress.ArbitrumSepolia['USDC.e']
    }
  }

  // Arbitrum One USDC when Ethereum is the parent chain
  if (
    isTokenArbitrumOneNativeUSDC(tokenAddress) &&
    isParentChainEthereumMainnet
  ) {
    return {
      ...commonUSDC,
      address: CommonAddress.ArbitrumOne.USDC,
      l2Address: CommonAddress.ArbitrumOne.USDC
    }
  }

  // Arbitrum Sepolia USDC when Ethereum is the parent chain
  if (isTokenArbitrumSepoliaNativeUSDC(tokenAddress) && isParentChainSepolia) {
    return {
      ...commonUSDC,
      address: CommonAddress.ArbitrumSepolia.USDC,
      l2Address: CommonAddress.ArbitrumSepolia.USDC
    }
  }

  // Arbitrum USDC with Orbit chains
  if (
    (isTokenArbitrumOneNativeUSDC(tokenAddress) && isParentChainArbitrumOne) ||
    (isTokenArbitrumSepoliaNativeUSDC(tokenAddress) &&
      isParentChainArbitrumSepolia)
  ) {
    let childChainUsdcAddress
    try {
      childChainUsdcAddress = isNetwork(childChainId).isOrbitChain
        ? (
            await getL2ERC20Address({
              erc20L1Address: tokenAddress,
              l1Provider: parentProvider,
              l2Provider: childProvider
            })
          ).toLowerCase()
        : undefined
    } catch {
      // could be never bridged before
    }

    return {
      ...commonUSDC,
      address: tokenAddress,
      l2Address: childChainUsdcAddress
    }
  }

  return null
}
