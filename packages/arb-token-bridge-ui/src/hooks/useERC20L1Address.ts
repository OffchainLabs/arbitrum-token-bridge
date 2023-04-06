import { Provider } from '@ethersproject/providers'
import useSWRImmutable from 'swr/immutable'
import { getL1ERC20Address } from '../token-bridge-sdk'

/**
 * Returns L1 address
 *
 * @param eitherL1OrL2Address string Token address (on L1 or L2)
 * @param provider Provider
 * @returns
 */
const useERC20L1Address = ({
  eitherL1OrL2Address,
  l2Provider
}: {
  eitherL1OrL2Address: string
  l2Provider: Provider
}) => {
  const { data = null, isValidating } = useSWRImmutable(
    ['useERC20L1Address', eitherL1OrL2Address],
    async () => {
      const address =
        (await getL1ERC20Address({
          erc20L2Address: eitherL1OrL2Address,
          l2Provider
        })) ?? eitherL1OrL2Address
      return address.toLowerCase()
    },
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000
    }
  )

  return { data, isLoading: isValidating }
}

export { useERC20L1Address }
