import { useWallet } from '@arbitrum/use-wallet'
import { Web3Provider } from '@ethersproject/providers'
import { ChainId, getNetworkName } from '../../util/networks'
import { supportedNetworks, switchChain } from '../../util/NetworkUtils'
import { Button } from './Button'

export const UnsupportedNetworkContent = () => {
  const { provider } = useWallet()

  return (
    <div className="flex flex-col items-center space-y-8 py-24 px-12">
      <div className="flex w-full justify-center">
        <span className="center py-4 text-center text-3xl font-medium text-white">
          Oops! You’re connected to a wrong network.
        </span>
      </div>

      {Object.keys(supportedNetworks).map(chainId => (
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
            supportedNetworks?.[Number(chainId) as ChainId]?.['btnThemeClass']
          } w-6/12 min-w-max py-3`}
          aria-label={`Switch to ${getNetworkName(Number(chainId))}`}
        >
          <div className="flex flex-row items-center justify-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center">
              <img
                src={supportedNetworks[Number(chainId) as ChainId]?.['img']}
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
