import { useSwitchNetwork } from 'wagmi'
import Image from 'next/image'

import {
  ChainId,
  getNetworkLogo,
  getNetworkName,
  handleSwitchNetworkError
} from '../../util/networks'
import { Button } from './Button'

// info about the logo and the button class of network list
const networkButtonsStyles: {
  [key in ChainId]?: { btnThemeClass: string }
} = {
  [ChainId.Mainnet]: {
    btnThemeClass: 'bg-blue-arbitrum'
  },
  [ChainId.ArbitrumOne]: {
    btnThemeClass: 'bg-blue-arbitrum'
  },
  [ChainId.ArbitrumNova]: {
    btnThemeClass: 'bg-brick-dark'
  }
}

export const MainNetworkNotSupported = ({
  supportedNetworks
}: {
  supportedNetworks: ChainId[]
}) => {
  const { switchNetwork } = useSwitchNetwork({
    onError: handleSwitchNetworkError
  })

  return (
    <div className="flex max-w-lg flex-col items-center space-y-8 px-12 py-12 md:items-start md:pr-24 md:pl-0">
      <div className="flex w-full justify-center">
        <span className="center py-4 text-3xl font-medium text-white">
          Oops! You’re connected to the wrong network
        </span>
      </div>

      {supportedNetworks?.map(chainId => (
        <Button
          variant="primary"
          onClick={() => switchNetwork?.(Number(chainId))}
          key={chainId}
          textLeft
          className={`text-md ${
            networkButtonsStyles?.[Number(chainId) as ChainId]?.[
              'btnThemeClass'
            ] ?? ''
          } w-full min-w-max justify-start px-5 py-2`}
          aria-label={`Switch to ${getNetworkName(Number(chainId))}`}
        >
          <div className="flex flex-row items-center justify-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center">
              <Image
                src={getNetworkLogo(Number(chainId))}
                alt={`${getNetworkName(Number(chainId))} logo`}
                className="h-full w-auto"
                width={32}
                height={32}
              />
            </div>
            <span> {`Switch to ${getNetworkName(Number(chainId))}`}</span>
          </div>
        </Button>
      ))}
    </div>
  )
}
