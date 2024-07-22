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
  isTokenSepoliaUSDC
} from '../util/TokenUtils'
import { useNetworks } from './useNetworks'
import { isNetwork } from '../util/networks'
import { CommonAddress } from '../util/CommonAddressUtils'
import { useNetworksRelationship } from './useNetworksRelationship'

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
  const {
    isEthereumMainnet: isParentChainEthereumMainnet,
    isSepolia: isParentChainSepolia,
    isArbitrumOne: isParentChainArbitrumOne,
    isArbitrumSepolia: isParentChainArbitrumSepolia
  } = isNetwork(parentChain.id)

  const fetcher: () => Promise<ERC20BridgeToken | null> =
    useCallback(async () => {
      if (!tokenFromSearchParams) {
        return null
      }

      const isArbitrumOneUsdc = isTokenArbitrumOneNativeUSDC(
        tokenFromSearchParams
      )
      const isArbitrumSepoliaUsdc = isTokenArbitrumSepoliaNativeUSDC(
        tokenFromSearchParams
      )

      // Ethereum Mainnet USDC
      if (
        isTokenMainnetUSDC(tokenFromSearchParams) &&
        isParentChainEthereumMainnet
      ) {
        return {
          ...commonUSDC,
          address: CommonAddress.Ethereum.USDC,
          l2Address: CommonAddress.ArbitrumOne['USDC.e']
        }
      }

      // Ethereum Sepolia USDC
      if (isTokenSepoliaUSDC(tokenFromSearchParams) && isParentChainSepolia) {
        return {
          ...commonUSDC,
          address: CommonAddress.Sepolia.USDC,
          l2Address: CommonAddress.ArbitrumSepolia['USDC.e']
        }
      }

      // USDC when depositing to an Orbit chain
      if (
        (isArbitrumOneUsdc && isParentChainArbitrumOne) ||
        (isArbitrumSepoliaUsdc && isParentChainArbitrumSepolia)
      ) {
        let childChainUsdcAddress
        try {
          childChainUsdcAddress = isNetwork(childChain.id).isOrbitChain
            ? (
                await getL2ERC20Address({
                  erc20L1Address: tokenFromSearchParams,
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
          address: tokenFromSearchParams,
          l2Address: childChainUsdcAddress,
          decimals: 6,
          listIds: new Set()
        }
      }

      if (!tokensFromLists || !tokensFromUser) {
        return null
      }

      return (
        Object.values({ ...tokensFromLists, ...tokensFromUser }).find(
          tokenFromLists =>
            tokenFromLists?.address.toLowerCase() ===
            tokenFromSearchParams.toLowerCase()
        ) || null
      )
    }, [
      childChain.id,
      childChainProvider,
      isParentChainArbitrumOne,
      isParentChainArbitrumSepolia,
      isParentChainEthereumMainnet,
      isParentChainSepolia,
      parentChainProvider,
      tokenFromSearchParams,
      tokensFromLists,
      tokensFromUser
    ])

  const { data } = useSWRImmutable<ERC20BridgeToken | null>(
    [parentChain.id, childChain.id, tokenFromSearchParams],
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
