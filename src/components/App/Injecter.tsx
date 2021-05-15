import React, { useEffect, useState, useContext, useCallback } from 'react'
import { getInjectedWeb3, setChangeListeners } from 'util/web3'
import { ConnectionState, l2Network } from 'util/index'
import * as ethers from 'ethers'
import App from './index'
import ModeContext from './ModeContext'
import Alert from 'react-bootstrap/Alert'
import Container from 'react-bootstrap/Container'
import ConnectWarning from './ConnectWarning'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import fox from 'media/images/metamask-fox.svg'
import networks, { arbNetworkIds }  from "./networks"
import { useLocalStorage } from '@rehooks/local-storage'
import { Bridge, L1Bridge, L2Bridge } from 'arb-ts'

const Injector = () => {
  const [bridge, setBridge] = useState<Bridge>()
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.LOADING
  )
  let [_l2Network, setL2Network] = useLocalStorage<l2Network>('l2Network', 'v3')
  const l2Network = _l2Network || "v3"
  const {
    REACT_APP_ETH_NETWORK_ID: ethNetworkId,
    REACT_APP_ETH_NODE_URL: ethNodeUrl,

  } = process.env
  
  const l1TokenBridgeAddress = process.env.REACT_APP_L1_TOKEN_BRIDGE_ADDRESS || ''
  const l2TokenBridgeAddress = process.env.REACT_APP_L2_TOKEN_BRIDGE_ADDRESS || ''
  
  // useEffect(()=> {
  //   // @ts-ignore
  //   window.ethereum.on('networkChanged', (chainId: number) => {
  //     updateConnectionState()
  //       })
  // }, [])


const updateConnectionState = useCallback(() => {  
  
  if (connectionState === ConnectionState.LOADING) {

    if (window.location.hash === "#info"){
      return setConnectionState(ConnectionState.WRONG_NETWORK)
    }
    try {
      getInjectedWeb3().then(([provider, networkVersion]) => {
        if (!provider) {
          return setConnectionState(ConnectionState.NO_METAMASK)
        }

        switch (networkVersion) {
          case ethNetworkId: {
            console.info('deposit mode detected')
            const ethProvider = provider
            const arbProvider = new ethers.providers.JsonRpcProvider(
              "https://5.arbitrum.io/rpc"
            ) 

            const l1Signer =  ethProvider.getSigner(0)
            const l2Signer = arbProvider.getSigner(
              window.ethereum?.selectedAddress
            )
            const bridge = new Bridge(l1TokenBridgeAddress, l2TokenBridgeAddress, l1Signer, l2Signer, )

            setBridge(bridge)
            setConnectionState(ConnectionState.DEPOSIT_MODE)
            break
          }
          case '149591129601170':
          {
            console.info('withdrawal mode detected')
            const ethProvider = new ethers.providers.JsonRpcProvider(
              ethNodeUrl
            )
            const arbProvider = provider
            const l1Signer = ethProvider.getSigner(
              window.ethereum?.selectedAddress
            )
            const l2Signer = arbProvider.getSigner(0)
            const bridge = new Bridge(l1TokenBridgeAddress, l2TokenBridgeAddress, l1Signer, l2Signer, )

            setBridge(bridge)
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
                  <a href="https://metamask.io/download.html" target="_blank">
                    <img width="150" src={fox} />{' '}
                  </a>
                </Col>
              </Row>
              <Row className="text-center">
                <Col>
                  <h4>
                    {' '}
                    <a href="https://metamask.io/download.html" target="_blank">
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
          <div>
            <ConnectWarning />
          </div>
        )
      default:
        if (!bridge) {
          throw new Error('initialization error')
        }
        return (
          <ModeContext.Provider value={connectionState}>
            <App bridge={bridge}/>
          </ModeContext.Provider>
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
