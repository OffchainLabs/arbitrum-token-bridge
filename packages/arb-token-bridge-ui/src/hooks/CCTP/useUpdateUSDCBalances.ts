import { useCallback } from 'react'
import { Address } from 'wagmi'

import { CommonAddress } from '../../util/CommonAddressUtils'
import { getL2ERC20Address } from '../../util/TokenUtils'
import { useNetworks } from '../useNetworks'
import { useNetworksRelationship } from '../useNetworksRelationship'
import { isNetwork } from '../../util/networks'
import { useBalances } from '../useBalances'

export function useUpdateUSDCBalances({
  walletAddress
}: {
  walletAddress: string | undefined
}) {
  const [networks] = useNetworks()
  const { parentChainProvider, parentChain, childChainProvider } =
    useNetworksRelationship(networks)
  const {
    updateErc20ParentBalances: updateErc20ParentBalance,
    updateErc20ChildBalances: updateErc20ChildBalance
  } = useBalances({
    l1WalletAddress: walletAddress as Address,
    l2WalletAddress: walletAddress as Address
  })

  const updateUSDCBalances = useCallback(async () => {
    const { isEthereumMainnet, isSepolia, isArbitrumOne, isArbitrumSepolia } =
      isNetwork(parentChain.id)

    let parentChainUsdcAddress, childChainUsdcAddress: string | undefined

    if (isEthereumMainnet || isSepolia) {
      parentChainUsdcAddress = isEthereumMainnet
        ? CommonAddress.Ethereum.USDC
        : CommonAddress.Sepolia.USDC

      childChainUsdcAddress = isEthereumMainnet
        ? CommonAddress.ArbitrumOne.USDC
        : CommonAddress.ArbitrumSepolia.USDC
    }

    if (isArbitrumOne || isArbitrumSepolia) {
      parentChainUsdcAddress = isArbitrumOne
        ? CommonAddress.ArbitrumOne.USDC
        : CommonAddress.ArbitrumSepolia.USDC
    }

    // USDC is not native for the selected networks, do nothing
    if (!parentChainUsdcAddress) {
      return
    }

    updateErc20ParentBalance([parentChainUsdcAddress])

    // we don't have native USDC addresses for Orbit chains, we need to fetch it
    if (!childChainUsdcAddress) {
      try {
        childChainUsdcAddress = (
          await getL2ERC20Address({
            erc20L1Address: parentChainUsdcAddress,
            l1Provider: parentChainProvider,
            l2Provider: childChainProvider
          })
        ).toLowerCase()
      } catch {
        // could be never bridged before
        return
      }
    }

    if (childChainUsdcAddress) {
      updateErc20ChildBalance([childChainUsdcAddress])
    }
  }, [
    childChainProvider,
    parentChain.id,
    parentChainProvider,
    updateErc20ParentBalance,
    updateErc20ChildBalance
  ])

  return { updateUSDCBalances }
}
