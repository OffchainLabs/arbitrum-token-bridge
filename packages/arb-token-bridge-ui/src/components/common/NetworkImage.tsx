import Image from 'next/image'
import { twMerge } from 'tailwind-merge'

import { getNetworkName } from '../../util/networks'
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig'

export const NetworkImage = ({
  chainId,
  className,
  size
}: {
  chainId: number
  className?: string
  size?: number
}) => {
  const imageSize = size ?? 16
  const { network, color } = getBridgeUiConfigForChain(chainId)
  const networkName = getNetworkName(chainId)

  return (
    <div
      style={{
        backgroundColor: `${color}33`
      }}
      className={twMerge(
        'flex w-4 shrink-0 items-center justify-center rounded-full p-[4px]',
        className
      )}
    >
      <Image
        src={network.logo}
        alt={`${networkName} logo`}
        className="h-full w-auto"
        width={imageSize}
        height={imageSize}
      />
    </div>
  )
}
