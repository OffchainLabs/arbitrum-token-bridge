import { Provider } from '@ethersproject/providers'
import useSWRImmutable from 'swr/immutable'
import { Erc20Bridger } from '@arbitrum/sdk'

/**
 * Retrieves the L1 address of an ERC-20 token using its L2 address.
 * @param erc20L2Address
 * @returns
 */
async function getL1ERC20Address({
  erc20L2Address,
  l2Provider
}: {
  erc20L2Address: string
  l2Provider: Provider
}): Promise<string | null> {
  try {
    const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
    return await erc20Bridger.getL1ERC20Address(erc20L2Address, l2Provider)
  } catch (error) {
    return null
  }
}

/**
 * Returns L1 address
 *
 * @param eitherL1OrL2Address string Token address (on L1 or L2)
 * @param l2Provider L2 Provider
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

export { getL1ERC20Address, useERC20L1Address }
