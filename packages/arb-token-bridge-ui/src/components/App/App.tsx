import React, { createContext, useContext, useEffect, useState } from 'react'

import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'
import { useWallet } from '@gimmixorg/use-wallet'
import axios from 'axios'
import * as ethers from 'ethers'
import { BigNumber, Contract } from 'ethers'
import { hexValue } from 'ethers/lib/utils'
import { createOvermind, Overmind } from 'overmind'
import { Provider } from 'overmind-react'
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom'
import { useLocalStorage } from 'react-use'
import { ConnectionState, gnosisInterface } from 'src/util/index'
import { Bridge, WalletType } from 'token-bridge-sdk'

import { config, useActions, useAppState } from '../../state'
import { modalProviderOpts } from '../../util/modelProviderOpts'
import networks, { Network } from '../../util/networks'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { Layout } from '../common/Layout'
import MessageOverlay from '../common/MessageOverlay'
import { DisclaimerModal } from '../DisclaimerModal/DisclaimerModal'
import MainContent from '../MainContent/MainContent'
import { ArbTokenBridgeStoreSync } from '../syncers/ArbTokenBridgeStoreSync'
import { BalanceUpdater } from '../syncers/BalanceUpdater'
import { CurrentL1BlockNumberUpdater } from '../syncers/CurrentL1BlockNumberUpdater'
import { PendingTransactionsUpdater } from '../syncers/PendingTransactionsUpdater'
import { PWLoadedUpdater } from '../syncers/PWLoadedUpdater'
import { RetryableTxnsIncluder } from '../syncers/RetryableTxnsIncluder'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { TermsOfService } from '../TermsOfService/TermsOfService'

const NoMetamaskIndicator = (): JSX.Element => {
  const { connect } = useWallet()

  function showConnectionModal() {
    connect(modalProviderOpts)
  }

  useEffect(() => {
    showConnectionModal()
  }, [])

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-center mb-4">
        <Alert type="blue">Ethereum provider not detected, please login.</Alert>
      </div>

      <div className="flex justify-center mb-4">
        <a
          href="https://metamask.io/download.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            className="w-full max-w-96"
            src="/images/impact_transparent.png"
            alt="Wallet"
          />
        </a>
      </div>
      <div className="flex justify-center">
        <Button
          onClick={() => showConnectionModal()}
          type="button"
          className="px-12"
        >
          Login
        </Button>
      </div>
    </div>
  )
}

interface BridgeContextInterface {
  bridge: Bridge | null
  walletType: WalletType | null
}

export const BridgeContext = createContext<BridgeContextInterface>({
  bridge: null,
  walletType: null
})

const AppContent = (): JSX.Element => {
  const { bridge } = useContext(BridgeContext)
  const {
    app: { connectionState }
  } = useAppState()

  if (connectionState === ConnectionState.NO_METAMASK) {
    return <NoMetamaskIndicator />
  }
  if (connectionState === ConnectionState.WRONG_NETWORK) {
    return (
      <div>
        <div className="mb-4">
          You are on the wrong network. Read our tutorial bellow on how to
          switch networks.
        </div>
        <iframe
          title="Bridge Tutorial"
          src="https://arbitrum.io/bridge-tutorial/"
          width="100%"
          height={500}
        />
      </div>
    )
    // return <ConnectWarning />
  }
  if (connectionState === ConnectionState.SEQUENCER_UPDATE) {
    return (
      <Alert type="red">
        Note: The Arbitrum Sequencer Will be offline today 3pm-5pm EST for
        maintenance. Thanks for your patience!
      </Alert>
    )
  }

  if (connectionState === ConnectionState.NETWORK_ERROR) {
    return (
      <Alert type="red">
        Error: unable to connect to network. Try again soon and contact{' '}
        <a
          rel="noreferrer"
          target="_blank"
          href="https://support.arbitrum.io/hc/en-us/requests/new"
        >
          <u>support</u>
        </a>{' '}
        if problem persists.
      </Alert>
    )
  }

  return (
    <>
      {bridge && (
        <>
          <CurrentL1BlockNumberUpdater />
          <PendingTransactionsUpdater />
          <RetryableTxnsIncluder />
          <BalanceUpdater />
          <PWLoadedUpdater />
          <TokenListSyncer />
        </>
      )}

      <MessageOverlay />

      <MainContent />
    </>
  )
}

const Injector = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const actions = useActions()

  const [globalBridgeData, setGlobalBridgeData] =
    useState<BridgeContextInterface>({
      bridge: null,
      walletType: null
    })

  const setGlobalBridge = async (bridge: Bridge | null) => {
    if (!bridge) {
      setGlobalBridgeData({
        bridge: null,
        walletType: null
      })
    } else {
      const { l1Signer, l2Signer, l1Provider, l2Provider } = bridge
      const l1Address = await l1Signer.getAddress()
      const l2Address = await l2Signer.getAddress()
      const l1AddressIsSmartContract =
        (await l1Provider.getCode(l1Address)).length > 2
      const l2AddressIsSmartContract =
        (await l2Provider.getCode(l2Address)).length > 2

      const walletType: WalletType = await (async () => {
        if (!l1AddressIsSmartContract && !l2AddressIsSmartContract) {
          return WalletType.EOA
        }

        if (l1AddressIsSmartContract && l2AddressIsSmartContract) {
          // check if gnosis / gnosis-like wallet w/ same L1 & L2 address & same owners
          if (l1Address !== l2Address) {
            console.warn(
              `SC wallet error: wallets have different addresses: l1: ${l1Address}; l2: ${l2Address} `
            )
            return WalletType.UNSUPPORTED_CONTRACT_WALLET
          }

          try {
            const l1Contract = new Contract(
              l1Address,
              gnosisInterface,
              l1Provider
            )
            const l1Owners: string[] = [
              ...(await l1Contract.getOwners())
            ].sort()
            const l2Contract = new Contract(
              l2Address,
              gnosisInterface,
              l2Provider
            )
            const l2Owners: string[] = [
              ...(await l2Contract.getOwners())
            ].sort()
            const walletsHaveSameOwners =
              JSON.stringify(l1Owners) === JSON.stringify(l2Owners)
            if (!walletsHaveSameOwners) {
              console.warn(
                `SC wallet error; owners don't match:`,
                l1Owners,
                l2Owners
              )
            }
            return walletsHaveSameOwners
              ? WalletType.SUPPORTED_CONTRACT_WALLET
              : WalletType.UNSUPPORTED_CONTRACT_WALLET
          } catch (e) {
            console.warn('SC wallet error: error checking Gnosis wallet:', e)
            return WalletType.UNSUPPORTED_CONTRACT_WALLET
          }
        }
        return WalletType.UNSUPPORTED_CONTRACT_WALLET
      })()

      setGlobalBridgeData({
        bridge,
        walletType
      })
    }
  }

  const { bridge: globalBridge } = globalBridgeData

  const {
    account: usersMetamaskAddress,
    provider: library,
    network: networkInfo
  } = useWallet()
  const networkVersion = networkInfo?.chainId

  useEffect(() => {
    axios
      .get(
        'https://raw.githubusercontent.com/OffchainLabs/arb-token-lists/master/src/WarningList/warningTokens.json'
      )
      .then(res => {
        actions.app.setWarningTokens(res.data)
      })
      .catch(err => {
        console.warn('Failed to fetch warning tokens:', err)
      })
  }, [])

  useEffect(() => {
    if (library) {
      const changeNetwork = async (chainId: string) => {
        const targetNetwork = networks[chainId]
        if (!targetNetwork) {
          throw new Error(`Cannot add unsupported network ${chainId}`)
        }
        const hexChainId = hexValue(BigNumber.from(chainId))
        const metamask = library?.provider

        if (metamask && metamask.isMetaMask) {
          console.log('Attempting to switch to chain', chainId)
          try {
            // @ts-ignore
            await metamask.request({
              method: 'wallet_switchEthereumChain',
              params: [
                {
                  chainId: hexChainId
                }
              ]
            })
          } catch (err: any) {
            if (err.code === 4902) {
              console.log(
                `Network ${chainId} not yet added to metamask; adding now:`
              )
              // @ts-ignore
              await metamask.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: hexChainId,
                    chainName: targetNetwork.name,
                    nativeCurrency: {
                      name: 'Ether',
                      symbol: 'ETH',
                      decimals: 18
                    },
                    rpcUrls: [targetNetwork.url],
                    blockExplorerUrls: [targetNetwork.explorerUrl]
                  }
                ]
              })
            } else {
              throw new Error(err)
            }
          }
        } else {
          // provider is not metamask, so no `wallet_switchEthereumChain` support
          console.log(
            'Not sure if current provider supports wallet_switchEthereumChain'
          )
          // TODO: show user a nice dialogue box instead of
          // eslint-disable-next-line no-alert
          alert('Please connect to appropriate chain')
          // TODO: reset state so user can attempt to press "Deposit" again
        }
      }
      actions.app.setChangeNetwork(changeNetwork)
    }
  }, [library])

  async function initBridge(): Promise<Bridge | undefined> {
    function getL1Signer(network: Network) {
      if (network.isArbitrum) {
        const partnerNetwork = networks[network.partnerChainID]
        const ethProvider = new ethers.providers.JsonRpcProvider(
          partnerNetwork.url
        )
        return ethProvider.getSigner(usersMetamaskAddress!)
      }
      return library?.getSigner(0) as JsonRpcSigner
    }

    function getL2Signer(network: Network) {
      if (network.isArbitrum) {
        return library?.getSigner(0) as JsonRpcSigner
      }
      const partnerNetwork = networks[network.partnerChainID]

      const arbProvider = new ethers.providers.JsonRpcProvider(
        partnerNetwork.url
      )

      return arbProvider.getSigner(usersMetamaskAddress!)
    }

    actions.app.setNetworkID(`${networkVersion}`)

    const network = networks[`${networkVersion}`]
    if (!network) {
      console.warn('WARNING: unsupported network')
      actions.app.setConnectionState(ConnectionState.WRONG_NETWORK)
      return
    }

    const l1Signer = getL1Signer(network)
    const l2Signer = getL2Signer(network)

    const l1Address = await l1Signer.getAddress()
    const l2Address = await l2Signer.getAddress()

    try {
      const l1AddressIsEOA =
        (await l1Signer.provider.getCode(l1Address)).length <= 2
      const l2AddressIsEOA =
        (await l2Signer.provider.getCode(l2Address)).length <= 2

      if (!l1AddressIsEOA || !l2AddressIsEOA) {
        actions.app.setConnectionState(ConnectionState.NOT_EOA)
        return undefined
      }
    } catch (err) {
      console.warn('CONNECTION ERROR', err)

      // The get code queries doubles as as network liveness check
      // We could check err.code === 'NETWORK_ERROR' for more granular handling, but any error can/should be handled.
      actions.app.setConnectionState(ConnectionState.NETWORK_ERROR)
    }

    const bridge = await Bridge.init(l1Signer, l2Signer)
    setGlobalBridge(bridge)
    if (!network.isArbitrum) {
      console.info('Deposit mode detected:')
      actions.app.setConnectionState(ConnectionState.DEPOSIT_MODE)
    } else {
      console.info('Withdrawal mode detected:')
      actions.app.setConnectionState(ConnectionState.WITHDRAW_MODE)
    }

    console.log('Gas price:', await library?.getGasPrice())
  }

  // STEP1 reset bridge on network switch or account switch, this inits all other resets
  useEffect(() => {
    if (!usersMetamaskAddress) {
      return
    }

    if (globalBridge) {
      setGlobalBridge(null)
    }
  }, [networkVersion, usersMetamaskAddress])

  // STEP2 after bridge is set to null, we start recreating everything
  useEffect(() => {
    if (globalBridge) {
      return
    }

    try {
      if (!networkVersion || !library) {
        actions.app.setConnectionState(ConnectionState.NO_METAMASK)
        return
      }

      actions.app.reset(`${networkVersion}`)

      initBridge()
    } catch (e) {
      console.log(e)
      actions.app.setConnectionState(ConnectionState.NO_METAMASK)
    }
  }, [globalBridge, networkVersion])

  return (
    <>
      {globalBridge && <ArbTokenBridgeStoreSync bridge={globalBridge} />}
      <BridgeContext.Provider value={globalBridgeData}>
        {children}
      </BridgeContext.Provider>
    </>
  )
}

function Routes() {
  const [tosAccepted, setTosAccepted] = useLocalStorage<string>(
    'arbitrum:bridge:tos'
  )

  const isTosAccepted = tosAccepted !== undefined
  return (
    <Router>
      <DisclaimerModal
        setTosAccepted={setTosAccepted}
        tosAccepted={isTosAccepted}
      />
      <Switch>
        <Route path="/tos">
          <TermsOfService />
        </Route>
        {isTosAccepted && (
          <Route path="/">
            <AppContent />
          </Route>
        )}
      </Switch>
    </Router>
  )
}

const App = (): JSX.Element => {
  const [overmind] = useState<Overmind<typeof config>>(createOvermind(config))

  return (
    <Provider value={overmind}>
      <Layout>
        <Injector>
          <Routes />
        </Injector>
      </Layout>
    </Provider>
  )
}

export default App
