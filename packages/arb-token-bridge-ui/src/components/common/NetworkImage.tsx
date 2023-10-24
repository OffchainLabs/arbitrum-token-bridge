import Image from 'next/image'
import { getNetworkLogo, getNetworkName, isNetwork } from '../../util/networks'

export const NetworkImage = ({
  chainId,
  theme = 'light'
}: {
  chainId: number
  theme?: 'light' | 'dark'
}) => {
  const size = isNetwork(chainId).isEthereum ? 12 : 16

  return (
    <Image
      src={getNetworkLogo(chainId, theme)}
      alt={`${getNetworkName(chainId)} logo`}
      width={size}
      height={size}
    />
  )
}
