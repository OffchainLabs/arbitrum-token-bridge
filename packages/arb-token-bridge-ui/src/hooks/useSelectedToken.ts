import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  useTokensFromLists,
  useTokensFromUser
} from '../components/TransferPanel/TokenSearchUtils'
import { useTokenFromSearchParams } from '../components/TransferPanel/TransferPanelUtils'
import { ERC20BridgeToken, TokenType } from './arbTokenBridge.types'
import {
  getL2ERC20Address,
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC
} from '../util/TokenUtils'
import { useNetworks } from './useNetworks'
import { isNetwork } from '../util/networks'
import { CommonAddress } from '../util/CommonAddressUtils'
import { useAppState } from '../state'
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
  const {
    app: {
      arbTokenBridge: { token }
    }
  } = useAppState()
  const { tokenFromSearchParams, setTokenQueryParam } =
    useTokenFromSearchParams()
  const tokensFromLists = useTokensFromLists()
  const tokensFromUser = useTokensFromUser()
  const [networks] = useNetworks()
  const { childChain, childChainProvider, parentChainProvider } =
    useNetworksRelationship(networks)
  const {
    isArbitrumOne: isDestinationChainArbitrumOne,
    isArbitrumSepolia: isDestinationChainArbitrumSepolia
  } = isNetwork(networks.destinationChain.id)

  const [_selectedToken, _setSelectedToken] = useState<ERC20BridgeToken | null>(
    null
  )

  useEffect(() => {
    async function getSelectedToken() {
      if (!tokenFromSearchParams) {
        _setSelectedToken(null)
        return
      }

      const isArbitrumOneUsdc = isTokenArbitrumOneNativeUSDC(
        tokenFromSearchParams
      )
      const isArbitrumSepoliaUsdc = isTokenArbitrumSepoliaNativeUSDC(
        tokenFromSearchParams
      )

      if (isArbitrumOneUsdc && isDestinationChainArbitrumOne) {
        token.updateTokenData(CommonAddress.Ethereum.USDC)
        _setSelectedToken({
          ...commonUSDC,
          address: CommonAddress.Ethereum.USDC,
          l2Address: CommonAddress.ArbitrumOne['USDC.e']
        })
        return
      }

      if (isArbitrumSepoliaUsdc && isDestinationChainArbitrumSepolia) {
        token.updateTokenData(CommonAddress.Sepolia.USDC)
        _setSelectedToken({
          ...commonUSDC,
          address: CommonAddress.Sepolia.USDC,
          l2Address: CommonAddress.ArbitrumSepolia['USDC.e']
        })
        return
      }

      if (isArbitrumOneUsdc || isArbitrumSepoliaUsdc) {
        // USDC with Orbit chains
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

        _setSelectedToken({
          name: 'USD Coin',
          type: TokenType.ERC20,
          symbol: 'USDC',
          address: tokenFromSearchParams,
          l2Address: childChainUsdcAddress,
          decimals: 6,
          listIds: new Set()
        })
        return
      }

      if (!tokensFromLists || !tokensFromUser) {
        _setSelectedToken(null)
        return
      }

      _setSelectedToken(
        Object.values({ ...tokensFromLists, ...tokensFromUser }).find(
          tokenFromLists =>
            tokenFromLists?.address.toLowerCase() ===
            tokenFromSearchParams.toLowerCase()
        ) || null
      )
    }

    getSelectedToken()
  }, [
    childChain.id,
    childChainProvider,
    isDestinationChainArbitrumOne,
    isDestinationChainArbitrumSepolia,
    parentChainProvider,
    _setSelectedToken,
    token,
    tokenFromSearchParams,
    tokensFromLists,
    tokensFromUser
  ])

  const setSelectedToken = useCallback(
    (erc20ParentAddress: string | null) => {
      setTokenQueryParam(erc20ParentAddress)
    },
    [setTokenQueryParam]
  )

  return {
    selectedToken: _selectedToken,
    setSelectedToken
  }
}
