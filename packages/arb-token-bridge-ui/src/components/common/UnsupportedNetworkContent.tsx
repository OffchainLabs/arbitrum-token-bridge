import { L1Network, L2Network } from '@arbitrum/sdk'
import { useAppState } from '../../state'
import { ChainId, networksListArray } from '../../util/networks'
import { Button } from './Button'

import EthereumLogo from '../../assets/EthereumLogo.png'
import ArbitrumOneLogo from '../../assets/ArbitrumOneLogo.svg'
import ArbitrumNovaLogo from '../../assets/ArbitrumNovaLogo.png'

const networkStyleMap: {
  [chainId: number]: { img: string; btnThemeClass: string }
} = {
  [ChainId.Mainnet]: {
    img: EthereumLogo,
    btnThemeClass: 'bg-blue-arbitrum'
  },
  [ChainId.ArbitrumOne]: {
    img: ArbitrumOneLogo,
    btnThemeClass: 'bg-blue-arbitrum'
  },
  [ChainId.ArbitrumNova]: {
    img: ArbitrumNovaLogo,
    btnThemeClass: 'bg-brick-dark'
  }
}

export const UnsupportedNetworkContent = () => {
  const {
    app: { changeNetwork }
  } = useAppState()

  const switchNetwork = async (network: L1Network | L2Network) => {
    await changeNetwork?.(network)
  }

  return (
    <div className="flex flex-col items-center space-y-8 py-24 px-12">
      <div className="flex w-full justify-center">
        <span className="center py-4 text-center text-3xl font-medium text-white">
          Oops! You’re connected to a wrong network.
        </span>
      </div>

      {networksListArray.map(network => (
        <Button
          variant="primary"
          onClick={() => {
            switchNetwork(network)
          }}
          className={`text-md ${
            networkStyleMap[network.chainID]['btnThemeClass']
          } py-3`}
        >
          <div className="flex flex-row items-center justify-center space-x-3">
            <img
              src={networkStyleMap[network.chainID]['img']}
              alt={`${network.name} logo`}
              className="max-w-8 max-h-8"
            />
            <span> {`Switch to ${network.name}`}</span>
          </div>
        </Button>
      ))}
    </div>
  )
}
