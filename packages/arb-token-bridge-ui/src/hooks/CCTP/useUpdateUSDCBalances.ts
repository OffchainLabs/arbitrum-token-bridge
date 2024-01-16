import { useCallback } from 'react'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { isTokenGoerliUSDC, isTokenMainnetUSDC } from '../../util/TokenUtils'
import { useBalance } from '../useBalance'
import { useNetworks } from '../useNetworks'
import { useNetworksRelationship } from '../useNetworksRelationship'

function getL1AddressFromAddress(address: string) {
  switch (address) {
    case CommonAddress.Goerli.USDC:
    case CommonAddress.ArbitrumGoerli.USDC:
    case CommonAddress.ArbitrumGoerli['USDC.e']:
      return CommonAddress.Goerli.USDC

    case CommonAddress.Ethereum.USDC:
    case CommonAddress.ArbitrumOne.USDC:
    case CommonAddress.ArbitrumOne['USDC.e']:
      return CommonAddress.Ethereum.USDC

    default:
      return CommonAddress.Ethereum.USDC
  }
}

export function useUpdateUSDCBalances({
  walletAddress
}: {
  walletAddress: string | undefined
}) {
  const [networks] = useNetworks()
  const { parentChainProvider, childChainProvider } =
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
    (address: `0x${string}` | string) => {
      const l1Address = getL1AddressFromAddress(address)

      updateErc20L1Balance([l1Address.toLowerCase()])
      if (isTokenMainnetUSDC(l1Address)) {
        updateErc20L2Balance([
          CommonAddress.ArbitrumOne.USDC,
          CommonAddress.ArbitrumOne['USDC.e']
        ])
      } else if (isTokenGoerliUSDC(l1Address)) {
        updateErc20L2Balance([
          CommonAddress.ArbitrumGoerli.USDC,
          CommonAddress.ArbitrumGoerli['USDC.e']
        ])
      }
    },
    [updateErc20L1Balance, updateErc20L2Balance]
  )

  return { updateUSDCBalances }
}
