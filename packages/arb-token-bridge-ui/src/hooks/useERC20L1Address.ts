import { Provider } from '@ethersproject/providers'
import useSWR from 'swr'
import { getL1ERC20Address } from 'token-bridge-sdk'

/**
 * Returns L1 address
 *
 * @param eitherL1OrL2Address string Token address (on L1 or L2)
 * @param provider Provider
 * @returns
 */
const useERC20L1Address = ({
  eitherL1OrL2Address,
  provider
}: {
  eitherL1OrL2Address: string
  provider: Provider
}) => {
  const { data = null, isValidating } = useSWR(
    eitherL1OrL2Address,
    async () => {
      const address =
        (await getL1ERC20Address(eitherL1OrL2Address, provider)) ||
        eitherL1OrL2Address
      return address.toLowerCase()
    },
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000,
      revalidateOnMount: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  )

  return { data, isLoading: isValidating }
}

export { useERC20L1Address }
