import { useCallback } from 'react'
import { CommonAddress } from '../util/CommonAddressUtils'
import { isTokenGoerliUSDC, isTokenMainnetUSDC } from '../util/TokenUtils'
import { useBalance } from './useBalance'
import { useNetworksAndSigners } from './useNetworksAndSigners'

function getL1AddressFromAddress(address: string) {
  switch (address) {
    case CommonAddress.ArbitrumGoerli.USDC:
      return CommonAddress.Goerli.USDC
    case CommonAddress.ArbitrumGoerli['USDC.e']:
      return CommonAddress.Goerli.USDC
    case CommonAddress.ArbitrumOne.USDC:
      return CommonAddress.Mainnet.USDC
    case CommonAddress.ArbitrumOne['USDC.e']:
      return CommonAddress.Mainnet.USDC
    default:
      return CommonAddress.Mainnet.USDC
  }
}

export function useUpdateUSDCBalances({
  walletAddress
}: {
  walletAddress: string
}) {
  const { l1, l2 } = useNetworksAndSigners()
  const {
    erc20: [, updateErc20L1Balance]
  } = useBalance({
    provider: l1.provider,
    walletAddress
  })
  const {
    erc20: [, updateErc20L2Balance]
  } = useBalance({
    provider: l2.provider,
    walletAddress
  })

  const updateUSDCBalances = useCallback(
    (address: `0x${string}` | string) => {
      const l1Address = getL1AddressFromAddress(address)

      updateErc20L1Balance([l1Address.toLocaleLowerCase()])
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
    [updateErc20L2Balance]
  )

  return { updateUSDCBalances }
}
