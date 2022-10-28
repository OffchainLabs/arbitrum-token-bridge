import { useWallet } from '@arbitrum/use-wallet'
import { Web3Provider } from '@ethersproject/providers'
import { getNetworkName } from '../../util/networks'
import {
  networkStyleMap,
  supportedNetworks,
  switchChain
} from '../../util/NetworkUtils'
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

      {supportedNetworks.map(chainId => (
        <Button
          variant="primary"
          onClick={() => {
            switchChain({ chainId, provider: provider as Web3Provider })
          }}
          key={chainId}
          className={`text-md ${networkStyleMap?.[chainId]?.['btnThemeClass']} w-6/12 py-3`}
        >
          <div className="flex flex-row items-center justify-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center">
              <img
                src={networkStyleMap?.[chainId]?.['img']}
                alt={`${getNetworkName(chainId)} logo`}
                className="max-w-8 max-h-8"
              />
            </div>
            <span> {`Switch to ${getNetworkName(chainId)}`}</span>
          </div>
        </Button>
      ))}
    </div>
  )
}
