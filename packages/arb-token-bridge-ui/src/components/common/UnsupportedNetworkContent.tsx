import { getL2Network, getL1Network } from '@arbitrum/sdk'
import { useWallet } from '@arbitrum/use-wallet'
import { useAppState } from '../../state'
import { ChainId, getNetworkName } from '../../util/networks'
import {
  changeNetworkBasic,
  networkStyleMap,
  networkSelectionList
} from '../../util/NetworkUtils'
import { Button } from './Button'

export const UnsupportedNetworkContent = () => {
  const { provider } = useWallet()
  const { app } = useAppState()

  const changeNetwork = async (chainId: ChainId) => {
    let network
    try {
      network = await getL2Network(chainId)
    } catch {
      network = await getL1Network(chainId)
    }

    if (!network) return

    if (app.changeNetwork) {
      // if the rich app-injected version of changeNetwork is present, use that.
      await app.changeNetwork(network)
    } else {
      // else use the basic network switching logic
      await changeNetworkBasic(provider, network)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-8 py-24 px-12">
      <div className="flex w-full justify-center">
        <span className="center py-4 text-center text-3xl font-medium text-white">
          Oops! You’re connected to a wrong network.
        </span>
      </div>

      {networkSelectionList.map(chainId => (
        <Button
          variant="primary"
          onClick={() => {
            changeNetwork(chainId)
          }}
          key={chainId}
          className={`text-md ${networkStyleMap[chainId]['btnThemeClass']} w-6/12 py-3`}
        >
          <div className="flex flex-row items-center justify-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center">
              <img
                src={networkStyleMap[chainId]['img']}
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
