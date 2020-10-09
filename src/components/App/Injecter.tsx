import React, { useEffect, useState, useContext } from 'react'
import { getInjectedWeb3, setChangeListeners } from 'util/web3'
import { BridgeConfig, ConnectionState } from 'util/index'
import * as ethers from 'ethers'
import App from './index'
import ModeContext from './ModeContext'
import Alert from 'react-bootstrap/Alert'
import Container from 'react-bootstrap/Container'
import ConnectWarning from './ConnectWarning'

const Injector = () => {
  const [bridgeConfig, setBridgeConfig] = useState<BridgeConfig>()
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.LOADING
  )

  const {
    REACT_APP_ETH_NETWORK_ID: ethNetworkId,
    REACT_APP_ARB_NETWORK_ID: arbNetworkId,
    REACT_APP_ETH_NODE_URL: ethNodeUrl,
    REACT_APP_ARB_VALIDATOR_URL: arbValidatorUrl
  } = process.env

  useEffect(() => {
    if (connectionState === ConnectionState.LOADING) {
      try {
        getInjectedWeb3().then(([provider, networkVersion]) => {
          switch (networkVersion) {
            case ethNetworkId: {
              console.info('deposit mode detected')
              const ethProvider = provider
              const arbProvider = new ethers.providers.JsonRpcProvider(
                arbValidatorUrl
              )
              setBridgeConfig({
                ethProvider,
                arbProvider,
                ethSigner: ethProvider.getSigner(0),
                arbSigner: arbProvider.getSigner(
                  window.ethereum?.selectedAddress
                )
              })
              setConnectionState(ConnectionState.DEPOSIT_MODE)
              break
            }
            case arbNetworkId: {
              console.info('withdrawal mode detected')
              const ethProvider = new ethers.providers.JsonRpcProvider(
                ethNodeUrl
              )
              const arbProvider = provider
              setBridgeConfig({
                ethProvider,
                arbProvider,
                ethSigner: ethProvider.getSigner(
                  window.ethereum?.selectedAddress
                ),

                arbSigner: arbProvider.getSigner(0)
              })
              setConnectionState(ConnectionState.WITHDRAW_MODE)
              break
            }

            default: {
              setConnectionState(ConnectionState.WRONG_NETWORK)
            }
          }
          setChangeListeners()
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
        return <div>{renderAlert('loading...', 'primary')}</div>
      case ConnectionState.NO_METAMASK:
        return (
          <div>
            {renderAlert(
              'Ethereum provider not detected; make sure you have metamask installed.'
            )}
          </div>
        )
      case ConnectionState.WRONG_NETWORK:
        return (
          <div>
            <ConnectWarning/>
          </div>
        )
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

export const renderAlert = (
  message: string,
  variant: 'danger' | 'primary' = 'danger'
) => (
  <Container>
    <Alert variant={variant}>{message}</Alert>
  </Container>
)
export default Injector
