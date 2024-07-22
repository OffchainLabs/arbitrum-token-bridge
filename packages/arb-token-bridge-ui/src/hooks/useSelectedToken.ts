import { useCallback } from 'react'
import useSWRImmutable from 'swr/immutable'

import {
  useTokensFromLists,
  useTokensFromUser
} from '../components/TransferPanel/TokenSearchUtils'
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
import { Provider } from '@ethersproject/providers'
import { getChainIdFromProvider } from '@/token-bridge-sdk/utils'

type UseSelectedTokenProps = {
  selectedToken: ERC20BridgeToken | null
  setSelectedToken: (erc20ParentAddress: string | null) => void
}

const commonUSDC = {
  name: 'USD Coin',
  type: TokenType.ERC20,
  symbol: 'USDC',
  decimals: 6,
  listIds: new Set<number>()
}

export const useSelectedToken = (): UseSelectedTokenProps => {
  const { tokenFromSearchParams, setTokenQueryParam } =
    useTokenFromSearchParams()
  const tokensFromLists = useTokensFromLists()
  const tokensFromUser = useTokensFromUser()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChain, parentChainProvider } =
    useNetworksRelationship(networks)

  const fetcher: () => Promise<ERC20BridgeToken | null> =
    useCallback(async () => {
      if (!tokenFromSearchParams) {
        return null
      }

      if (isTokenNativeUSDC(tokenFromSearchParams)) {
        return getUsdcToken({
          tokenAddress: tokenFromSearchParams,
          parentChainProvider,
          childChainProvider
        })
      }

      if (!tokensFromLists || !tokensFromUser) {
        return null
      }

      return (
        tokensFromLists[tokenFromSearchParams] ||
        tokensFromUser[tokenFromSearchParams] ||
        null
      )
    }, [
      childChainProvider,
      parentChainProvider,
      tokenFromSearchParams,
      tokensFromLists,
      tokensFromUser
    ])

  const { data } = useSWRImmutable<ERC20BridgeToken | null>(
    [
      parentChain.id,
      childChain.id,
      tokenFromSearchParams,
      tokensFromLists,
      tokensFromUser
    ],
    fetcher
  )

  const setSelectedToken = useCallback(
    (erc20ParentAddress: string | null) => {
      setTokenQueryParam(erc20ParentAddress)
    },
    [setTokenQueryParam]
  )

  return {
    selectedToken: data ?? null,
    setSelectedToken
  }
}

async function getUsdcToken({
  tokenAddress,
  parentChainProvider,
  childChainProvider
}: {
  tokenAddress: string
  parentChainProvider: Provider
  childChainProvider: Provider
}) {
  const parentChainId = await getChainIdFromProvider(parentChainProvider)
  const childChainId = await getChainIdFromProvider(childChainProvider)

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

  // Arbitrum One USDC when Ethereum is the parent chain
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
              l1Provider: parentChainProvider,
              l2Provider: childChainProvider
            })
          ).toLowerCase()
        : undefined
    } catch {
      // could be never bridged before
    }

    return {
      name: 'USD Coin',
      type: TokenType.ERC20,
      symbol: 'USDC',
      address: tokenAddress,
      l2Address: childChainUsdcAddress,
      decimals: 6,
      listIds: new Set<number>()
    }
  }

  return null
}
