import { useCallback } from 'react'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { isTokenGoerliUSDC, isTokenMainnetUSDC } from '../../util/TokenUtils'
import { useBalance } from '../useBalance'
import { useNetworksAndSigners } from '../useNetworksAndSigners'
import { isNetwork } from '../../util/networks'
import { useAppState } from '../../state'

function getL1AddressFromAddress(address: string) {
  switch (address) {
    case CommonAddress.Goerli.USDC:
    case CommonAddress.ArbitrumGoerli.USDC:
    case CommonAddress.ArbitrumGoerli['USDC.e']:
      return CommonAddress.Goerli.USDC

    case CommonAddress.Mainnet.USDC:
    case CommonAddress.ArbitrumOne.USDC:
    case CommonAddress.ArbitrumOne['USDC.e']:
      return CommonAddress.Mainnet.USDC

    default:
      return CommonAddress.Mainnet.USDC
  }
}

export function useUpdateUSDCBalances({
  walletAddress
}: {
  walletAddress: string | undefined
}) {
  const { l1, l2 } = useNetworksAndSigners()
  const {
    app: { selectedToken }
  } = useAppState()
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
      if (!selectedToken) {
        return
      }

      const l1Address = getL1AddressFromAddress(address)
      const isOrbitChainSelected = isNetwork(l2.network.id).isOrbitChain

      if (isOrbitChainSelected) {
        const tokenAddress = selectedToken.l2Address ?? selectedToken.address
        updateErc20L2Balance([tokenAddress])
        return
      }

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
    [l2.network.id, selectedToken, updateErc20L1Balance, updateErc20L2Balance]
  )

  return { updateUSDCBalances }
}
