import Image from 'next/image'
import { getNetworkName, isNetwork } from '../../util/networks'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'

export const NetworkImage = ({
  chainId,
  theme = 'light'
}: {
  chainId: number
  theme?: 'light' | 'dark'
}) => {
  const size = isNetwork(chainId).isEthereumMainnetOrTestnet ? 12 : 16

  return (
    <div className="flex w-4 justify-center">
      <Image
        src={
          getBridgeUiConfigForChain(chainId, { variant: theme }).network.logo
        }
        alt={`${getNetworkName(chainId)} logo`}
        width={size}
        height={size}
      />
    </div>
  )
}
