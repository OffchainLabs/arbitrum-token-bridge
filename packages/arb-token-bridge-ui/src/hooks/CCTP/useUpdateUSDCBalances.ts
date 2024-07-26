import { useCallback } from 'react'
import { isAddress } from 'ethers/lib/utils.js'

import { CommonAddress } from '../../util/CommonAddressUtils'
import { getL2ERC20Address } from '../../util/TokenUtils'
import { useNetworks } from '../useNetworks'
import { useNetworksRelationship } from '../useNetworksRelationship'
import { isNetwork } from '../../util/networks'
import { useBalances } from '../useBalances'
import { Address } from 'wagmi'

export function useUpdateUSDCBalances({
  walletAddress
}: {
  walletAddress: string | undefined
}) {
  const [networks] = useNetworks()
  const { parentChainProvider, parentChain, childChainProvider } =
    useNetworksRelationship(networks)

  const _walletAddress: Address | undefined =
    walletAddress && isAddress(walletAddress) ? walletAddress : undefined
  const {
    updateErc20ParentBalances: updateErc20ParentBalance,
    updateErc20ChildBalances: updateErc20ChildBalance
  } = useBalances({
    parentWalletAddress: _walletAddress,
    childWalletAddress: _walletAddress
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
