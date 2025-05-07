import { Provider } from '@ethersproject/providers'
import useSWRImmutable from 'swr/immutable'
import { getL1ERC20Address } from '../util/TokenUtils'

/**
 * Returns L1 address
 *
 * @param eitherL1OrL2Address string Token address (on L1 or L2)
 * @param l2Provider L2 Provider
 * @returns
 */
export const useERC20L1Address = ({
  eitherL1OrL2Address,
  l2Provider
}: {
  eitherL1OrL2Address: string
  l2Provider: Provider
}) => {
  const { data = null, isValidating } = useSWRImmutable(
    [eitherL1OrL2Address, 'useERC20L1Address'],
    async ([_eitherL1OrL2Address]) => {
      const address =
        (await getL1ERC20Address({
          erc20L2Address: _eitherL1OrL2Address,
          l2Provider
        })) ?? _eitherL1OrL2Address
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
