import { useCallback } from 'react'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { getL2ERC20Address } from '../../util/TokenUtils'
import { useBalance } from '../useBalance'
import { useNetworks } from '../useNetworks'
import { useNetworksRelationship } from '../useNetworksRelationship'
import { isNetwork } from '../../util/networks'

export function useUpdateUSDCBalances({
  walletAddress
}: {
  walletAddress: string | undefined
}) {
  const [networks] = useNetworks()
  const { parentChainProvider, parentChain, childChainProvider } =
    useNetworksRelationship(networks)
  const {
    erc20: [, updateErc20L1Balance]
  } = useBalance({
    provider: parentChainProvider,
    walletAddress
  })
  const {
    erc20: [, updateErc20L2Balance]
  } = useBalance({
    provider: childChainProvider,
    walletAddress
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

    updateErc20L1Balance([parentChainUsdcAddress])

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
      updateErc20L2Balance([childChainUsdcAddress])
    }
  }, [
    childChainProvider,
    parentChain.id,
    parentChainProvider,
    updateErc20L1Balance,
    updateErc20L2Balance
  ])

  return { updateUSDCBalances }
}
