import { useCallback } from 'react'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { isTokenSepoliaUSDC, isTokenMainnetUSDC } from '../../util/TokenUtils'
import { useBalance } from '../useBalance'
import { useNetworks } from '../useNetworks'
import { useNetworksRelationship } from '../useNetworksRelationship'
import { Address } from '../../util/AddressUtils'
import { isNetwork } from '../../util/networks'

function getL1AddressFromAddress(
  address: string | undefined,
  childChainId: number
) {
  const { isOrbitChain, isTestnet } = isNetwork(childChainId)

  const parentChainUsdcAddressTestnet = isOrbitChain
    ? CommonAddress.ArbitrumSepolia.USDC
    : CommonAddress.Sepolia.USDC

  const parentChainUsdcAddressMainnet = isOrbitChain
    ? CommonAddress.ArbitrumOne.USDC
    : CommonAddress.Ethereum.USDC

  switch (address) {
    case CommonAddress.Sepolia.USDC:
    case CommonAddress.ArbitrumSepolia.USDC:
    case CommonAddress.ArbitrumSepolia['USDC.e']:
      return parentChainUsdcAddressTestnet

    case CommonAddress.Ethereum.USDC:
    case CommonAddress.ArbitrumOne.USDC:
    case CommonAddress.ArbitrumOne['USDC.e']:
      return parentChainUsdcAddressMainnet

    default:
      return isTestnet
        ? parentChainUsdcAddressTestnet
        : parentChainUsdcAddressMainnet
  }
}

export function useUpdateUSDCBalances({
  walletAddress
}: {
  walletAddress: string | undefined
}) {
  const [networks] = useNetworks()
  const { parentChainProvider, childChainProvider, childChain } =
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

  const updateUSDCBalances = useCallback(
    (address: Address | string | undefined) => {
      const l1Address = getL1AddressFromAddress(address, childChain.id)

      updateErc20L1Balance([l1Address.toLowerCase()])
      if (isTokenMainnetUSDC(l1Address)) {
        updateErc20L2Balance([
          CommonAddress.ArbitrumOne.USDC,
          CommonAddress.ArbitrumOne['USDC.e']
        ])
      } else if (isTokenSepoliaUSDC(l1Address)) {
        updateErc20L2Balance([
          CommonAddress.ArbitrumSepolia.USDC,
          CommonAddress.ArbitrumSepolia['USDC.e']
        ])
      }
    },
    [updateErc20L1Balance, updateErc20L2Balance, childChain.id]
  )

  return { updateUSDCBalances }
}
