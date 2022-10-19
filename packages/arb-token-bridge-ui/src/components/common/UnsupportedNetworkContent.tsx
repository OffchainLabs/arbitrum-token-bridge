import { L1Network, L2Network } from '@arbitrum/sdk'
import { useWallet } from '@arbitrum/use-wallet'
import { useAppState } from '../../state'
import { networksListArray, networkStyleMap } from '../../util/networks'
import { changeNetworkBasic } from '../../util/NetworkUtils'
import { Button } from './Button'

export const UnsupportedNetworkContent = () => {
  const { provider } = useWallet()
  const { app } = useAppState()

  const changeNetwork = async (network: L1Network | L2Network) => {
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

      {networksListArray.map(network => (
        <Button
          variant="primary"
          onClick={()=>{
            changeNetwork(network)
          }}
          key={network.chainID}
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
