import React, { useEffect, useState, useContext } from 'react'
import { getInjectedWeb3 } from 'util/web3'
import { BridgeConfig, ConnectionState } from 'util/index'
import * as ethers from 'ethers'
import App from './index'
import ModeContext from './ModeContext'

const Injector = () => {
  const [bridgeConfig, setBridgeConfig] = useState<BridgeConfig>()
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.LOADING
  )

  useEffect(() => {
    if (connectionState === ConnectionState.LOADING) {
      try {
        getInjectedWeb3().then(([provider, networkVersion]) => {
          switch (networkVersion) {
            case process.env.REACT_APP_ETH_NETWORK_ID: {
              console.info('deposit mode detected')
              const ethProvider = provider
              const arbProvider = new ethers.providers.JsonRpcProvider(
                process.env.REACT_APP_ARB_VALIDATOR_URL
              )
              setBridgeConfig({
                ethProvider,
                arbProvider,
                ethSigner: ethProvider.getSigner(0),
                // @ts-ignore // TODO
                arbSigner: arbProvider.getSigner(window.ethereum.selectedAddress
                )
              })
              setConnectionState(ConnectionState.DEPOSIT_MODE)
              break
            }
            case process.env.REACT_APP_ARB_NETWORK_ID: {
              console.info('withdrawal mode detected')
              const ethProvider = new ethers.providers.JsonRpcProvider(
                process.env.REACT_APP_ETH_NODE_URL
              )
              const arbProvider = provider
              setBridgeConfig({
                ethProvider,
                arbProvider,
                // @ts-ignore TODO
                ethSigner: ethProvider.getSigner(window.ethereum.selectedAddress),

                arbSigner: arbProvider.getSigner(0)
              })
              setConnectionState(ConnectionState.WITHDRAW_MODE)
              break
            }

            default: {
              setConnectionState(ConnectionState.WRONG_NETWORK)
            }
          }
        })
      } catch (e) {
        setConnectionState(ConnectionState.NO_METAMASK)
      }
    }
  }, [connectionState])

  const renderContent = (
    connectionState: ConnectionState,
    bridgeConfig: BridgeConfig | undefined
  ) => {
    switch (connectionState) {
      case ConnectionState.LOADING:
        return <div> loading</div>
      case ConnectionState.NO_METAMASK:
        return <div>no metamask</div>
      case ConnectionState.WRONG_NETWORK:
        return <div>wrong netowrk</div>
      default:
        if (!bridgeConfig) {
          throw new Error('initialization error')
        }
        return (
          <ModeContext.Provider value={connectionState}>
            <App {...bridgeConfig} />
          </ModeContext.Provider>
        )
    }
  }

  return <div>{renderContent(connectionState, bridgeConfig)}</div>
}
export default Injector
