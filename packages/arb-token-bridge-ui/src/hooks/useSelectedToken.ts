import { useCallback, useMemo } from 'react'
import useSWRImmutable from 'swr/immutable'
import { Provider } from '@ethersproject/providers'
import {
  getChainIdFromProvider,
  getProviderForChainId
} from '@/token-bridge-sdk/utils'

import { useTokenFromSearchParams } from '../components/TransferPanel/TransferPanelUtils'
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

const commonUSDC = {
  name: 'USD Coin',
  type: TokenType.ERC20,
  symbol: 'USDC',
  decimals: 6,
  listIds: new Set<number>()
}

export const useSelectedToken = () => {
  const { tokenFromSearchParams, setTokenQueryParam } =
    useTokenFromSearchParams()
  const [networks] = useNetworks()
  const { childChain, parentChain } = useNetworksRelationship(networks)
  const tokensFromLists = useTokensFromLists()
  const tokensFromUser = useTokensFromUser()

  const queryKey = useMemo(() => {
    return tokensFromLists && tokensFromUser
      ? ([
          parentChain.id,
          childChain.id,
          tokenFromSearchParams,
          'useSelectedToken'
        ] as const)
      : null
  }, [
    tokensFromLists,
    tokensFromUser,
    parentChain.id,
    childChain.id,
    tokenFromSearchParams
  ])

  const { data, mutate: refreshSelectedToken } = useSWRImmutable(
    queryKey,
    async ([parentChainId, childChainId]) => {
      const tokenAddressLowercased = tokenFromSearchParams?.toLowerCase()

      const parentProvider = getProviderForChainId(parentChainId)
      const childProvider = getProviderForChainId(childChainId)

      if (!tokenAddressLowercased) {
        return null
      }

      if (isTokenNativeUSDC(tokenAddressLowercased)) {
        return getUsdcToken({
          tokenAddress: tokenAddressLowercased,
          parentProvider,
          childProvider
        })
      }

      if (!tokensFromLists || !tokensFromUser) {
        return null
      }

      return (
        tokensFromLists[tokenAddressLowercased] ||
        tokensFromUser[tokenAddressLowercased] ||
        null
      )
    }
  )

  const setSelectedToken = useCallback(
    (erc20ParentAddress: string | null) =>
      setTokenQueryParam(erc20ParentAddress),
    [setTokenQueryParam]
  )

  return [data ?? null, setSelectedToken, refreshSelectedToken] as const
}

async function getUsdcToken({
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

  // Ethereum Mainnet USDC
  if (isTokenMainnetUSDC(tokenAddress) && isParentChainEthereumMainnet) {
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

  // Arbitrum One USDC when Ethereum is the par
  if (isTokenArbitrumOneNativeUSDC(tokenAddress) && !isParentChainArbitrumOne) {
    return {
      ...commonUSDC,
      address: CommonAddress.ArbitrumOne.USDC,
      l2Address: CommonAddress.ArbitrumOne.USDC
    }
  }

  // Arbitrum Sepolia USDC when Ethereum is the parent chain
  if (
    isTokenArbitrumSepoliaNativeUSDC(tokenAddress) &&
    !isParentChainArbitrumOne
  ) {
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
