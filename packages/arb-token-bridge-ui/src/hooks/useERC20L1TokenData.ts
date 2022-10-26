import useSWR from 'swr'
import { getL1TokenData } from 'token-bridge-sdk'

import { useAppState } from '../state'
import { useNetworksAndSigners } from './useNetworksAndSigners'

/**
 * Returns L1 token data regardless of address passed as parameter
 *
 * @param eitherL1OrL2Address string Token address (on L1 or L2)
 * @returns L1TokenData
 */
const useERC20L1TokenData = (eitherL1OrL2Address: string) => {
  const {
    app: {
      arbTokenBridge: { token, walletAddress }
    }
  } = useAppState()
  const { l1, l2 } = useNetworksAndSigners()

  const { data = null, isValidating } = useSWR(
    token ? eitherL1OrL2Address : null,
    async () => {
      return getL1TokenData({
        account: walletAddress,
        erc20L1Address:
          (await token.getL1ERC20Address(eitherL1OrL2Address)) ||
          eitherL1OrL2Address,
        l1Provider: l1.provider,
        l2Provider: l2.provider
      })
    },
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000
    }
  )

  return { data, isLoading: isValidating }
}

export { useERC20L1TokenData }
