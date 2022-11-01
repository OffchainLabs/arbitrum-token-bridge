import { useWallet } from '@arbitrum/use-wallet'
import { Web3Provider } from '@ethersproject/providers'
import {
  ChainId,
  getNetworkLogo,
  getNetworkName,
  switchChain
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
  const { provider } = useWallet()

  return (
    <div className="flex flex-col items-center space-y-8 py-24 px-12">
      <div className="flex w-full justify-center">
        <span className="center py-4 text-center text-3xl font-medium text-white">
          Oops! You’re connected to a wrong network.
        </span>
      </div>

      {supportedNetworks?.map(chainId => (
        <Button
          variant="primary"
          onClick={() => {
            switchChain({
              chainId: Number(chainId),
              provider: provider as Web3Provider
            })
          }}
          key={chainId}
          className={`text-md ${
            networkButtonsStyles?.[Number(chainId) as ChainId]?.[
              'btnThemeClass'
            ]
          } w-full min-w-max py-3 sm:w-6/12`}
          aria-label={`Switch to ${getNetworkName(Number(chainId))}`}
        >
          <div className="flex flex-row items-center justify-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center">
              <img
                src={getNetworkLogo(Number(chainId))}
                alt={`${getNetworkName(Number(chainId))} logo`}
                className="max-w-8 max-h-8"
              />
            </div>
            <span> {`Switch to ${getNetworkName(Number(chainId))}`}</span>
          </div>
        </Button>
      ))}
    </div>
  )
}
