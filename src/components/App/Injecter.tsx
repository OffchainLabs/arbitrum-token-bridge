import React, { useEffect, useState, useCallback } from 'react'
import { getInjectedWeb3, setChangeListeners } from 'util/web3'
import { ConnectionState } from 'util/index'
import * as ethers from 'ethers'
import App from './index'
import ModeContext from './ModeContext'
import NetworkIDContext from './NetworkContext'

import Alert from 'react-bootstrap/Alert'
import Container from 'react-bootstrap/Container'
import ConnectWarning from './ConnectWarning'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import fox from 'media/images/metamask-fox.svg'
import networks from './networks'
import { Bridge } from 'arb-ts'

const Injector = () => {
  const [bridge, setBridge] = useState<Bridge>()
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.LOADING
  )
  const [networkID, setNetworkID] = useState('')

  // useEffect(()=> {
  //   // @ts-ignore
  //   window.ethereum.on('networkChanged', (chainId: number) => {
  //     updateConnectionState()
  //       })
  // }, [])

  const updateConnectionState = useCallback(() => {
    if (connectionState === ConnectionState.LOADING) {
      try {
        getInjectedWeb3().then(([provider, networkVersion]) => {
          if (!provider) {
            return setConnectionState(ConnectionState.NO_METAMASK)
          }
          if (!networkVersion) {
            return setConnectionState(ConnectionState.NO_METAMASK)
          }

          setNetworkID(networkVersion)
          setChangeListeners()

          if (window.location.hash === '#tos') {
            return setConnectionState(ConnectionState.WRONG_NETWORK)
          }

          const network = networks[networkVersion]
          if (!network) {
            console.info('WARNING: unsupported network')
            window.location.href = 'https://arbitrum.io/bridge-tutorial/'
            return
          }

          const partnerNetwork = networks[network.partnerChainID]
          // if(network.chainID === '1' || partnerNetwork.chainID === '1'){
          //   return setConnectionState(ConnectionState.SEQUENCER_UPDATE)
          // }
          if (!network.isArbitrum) {
            console.info('deposit mode detected')
            const ethProvider = provider
            const arbProvider = new ethers.providers.JsonRpcProvider(
              partnerNetwork.url
            )

            const l1Signer = ethProvider.getSigner(0)
            const l2Signer = arbProvider.getSigner(
              window.ethereum?.selectedAddress
            )
            Bridge.init(
              l1Signer,
              l2Signer,
              network.tokenBridge.l1Address,
              network.tokenBridge.l2Address
            ).then(bridge => {
              setBridge(bridge)
              setConnectionState(ConnectionState.DEPOSIT_MODE)
            })
          } else {
            console.info('withdrawal mode detected')
            const ethProvider = new ethers.providers.JsonRpcProvider(
              partnerNetwork.url
            )
            const arbProvider = provider
            const l1Signer = ethProvider.getSigner(
              window.ethereum?.selectedAddress
            )
            const l2Signer = arbProvider.getSigner(0)
            Bridge.init(
              l1Signer,
              l2Signer,
              network.tokenBridge.l1Address,
              network.tokenBridge.l2Address
            ).then(bridge => {
              setBridge(bridge)
              setConnectionState(ConnectionState.WITHDRAW_MODE)
            })
          }
        })
      } catch (e) {
        setConnectionState(ConnectionState.NO_METAMASK)
      }
    }
  }, [connectionState, window.ethereum])
  useEffect(() => {
    updateConnectionState()
  }, [])

  const renderContent = (
    connectionState: ConnectionState,
    bridge: Bridge | undefined
  ) => {
    switch (connectionState) {
      case ConnectionState.LOADING:
        return <div>{renderAlert('loading...', 'primary')}</div>
      case ConnectionState.NO_METAMASK:
        return (
          <div>
            <Container>
              <Alert className="text-center" variant={'danger'}>
                Ethereum provider not detected; make sure you have MetaMask
                connected.
              </Alert>
              <Row className="text-center">
                <Col>
                  <a
                    href="https://metamask.io/download.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img width="150" src={fox} alt="fox" />{' '}
                  </a>
                </Col>
              </Row>
              <Row className="text-center">
                <Col>
                  <h4>
                    {' '}
                    <a
                      href="https://metamask.io/download.html"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Install MetaMask{' '}
                    </a>
                  </h4>
                </Col>
              </Row>
            </Container>
          </div>
        )
      case ConnectionState.WRONG_NETWORK:
        return (
          <NetworkIDContext.Provider value={networkID}>
            <div>
              <ConnectWarning />
            </div>
          </NetworkIDContext.Provider>
        )
      case ConnectionState.SEQUENCER_UPDATE:
        return (
          <NetworkIDContext.Provider value={networkID}>
            <div>
              {renderAlert(
                ' Note: The Arbitrum Sequencer Will be offline today 3pm-5pm EST for maintenance. Thanks for your patience!'
              )}
            </div>
          </NetworkIDContext.Provider>
        )
      case ConnectionState.DEPOSIT_MODE:
      case ConnectionState.WITHDRAW_MODE:
        if (bridge === undefined) {
          return <div>{renderAlert('loading...', 'primary')}</div>
        }

        return (
          <NetworkIDContext.Provider value={networkID}>
            <ModeContext.Provider value={connectionState}>
              <App bridge={bridge} />
            </ModeContext.Provider>
          </NetworkIDContext.Provider>
        )
    }
  }

  return <div>{renderContent(connectionState, bridge)}</div>
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
