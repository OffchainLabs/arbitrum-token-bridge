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

  // TODO: handle contrast here. If the Logo color, badge color, and background color don't look good, we should try some adjustments to the contrast
  return (
    <div
      style={{
        backgroundColor: `${color}75`
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
