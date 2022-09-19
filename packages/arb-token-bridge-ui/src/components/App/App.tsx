import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useWallet } from '@arbitrum/use-wallet'
import axios from 'axios'
import { BigNumber } from 'ethers'
import { hexValue } from 'ethers/lib/utils'
import { createOvermind, Overmind } from 'overmind'
import { Provider } from 'overmind-react'
import {
  Route,
  BrowserRouter as Router,
  Switch,
  useLocation
} from 'react-router-dom'
import { useLocalStorage } from 'react-use'
import { ConnectionState } from 'src/util/index'
import { BalanceProvider, TokenBridgeParams } from 'token-bridge-sdk'

import { L1Network, L2Network } from '@arbitrum/sdk'
import { ExternalProvider, JsonRpcProvider } from '@ethersproject/providers'
import Loader from 'react-loader-spinner'

import HeaderArbitrumLogoMainnet from '../../assets/HeaderArbitrumLogoMainnet.png'
import HeaderArbitrumLogoRinkeby from '../../assets/HeaderArbitrumLogoRinkeby.png'
import HeaderArbitrumLogoGoerli from '../../assets/HeaderArbitrumLogoGoerli.png'

import { WelcomeDialog } from './WelcomeDialog'
import { AppContextProvider, useAppContextState } from './AppContext'
import { config, useActions, useAppState } from '../../state'
import { modalProviderOpts } from '../../util/modelProviderOpts'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'
import { Layout } from '../common/Layout'
import { MainContent } from '../MainContent/MainContent'
import { ArbTokenBridgeStoreSync } from '../syncers/ArbTokenBridgeStoreSync'
import { BalanceUpdater } from '../syncers/BalanceUpdater'
import { PendingTransactionsUpdater } from '../syncers/PendingTransactionsUpdater'
import { PWLoadedUpdater } from '../syncers/PWLoadedUpdater'
import { RetryableTxnsIncluder } from '../syncers/RetryableTxnsIncluder'
import { TokenListSyncer } from '../syncers/TokenListSyncer'
import { TermsOfService, TOS_VERSION } from '../TermsOfService/TermsOfService'
import { ExternalLink } from '../common/ExternalLink'
import { useDialog } from '../common/Dialog'
import {
  useNetworksAndSigners,
  UseNetworksAndSignersStatus,
  UseNetworksAndSignersLoadingOrErrorStatus,
  NetworksAndSignersProvider,
  UseNetworksAndSignersConnectedResult
} from '../../hooks/useNetworksAndSigners'
import {
  HeaderContent,
  HeaderOverrides,
  HeaderOverridesProps
} from '../common/Header'
import { HeaderNetworkLoadingIndicator } from '../common/HeaderNetworkLoadingIndicator'
import { HeaderNetworkInformation } from '../common/HeaderNetworkInformation'
import { HeaderAccountPopover } from '../common/HeaderAccountPopover'
import { HeaderConnectWalletButton } from '../common/HeaderConnectWalletButton'
import { Notifications } from '../common/Notifications'
import { getNetworkName, isNetwork, rpcURLs } from '../../util/networks'

type Web3Provider = ExternalProvider & {
  isMetaMask?: boolean
  isImToken?: boolean
}
const isSwitchChainSupported = (provider: Web3Provider) =>
  provider && (provider.isMetaMask || provider.isImToken)

async function addressIsEOA(address: string, provider: JsonRpcProvider) {
  return (await provider.getCode(address)).length <= 2
}

const AppContent = (): JSX.Element => {
  const { l1 } = useNetworksAndSigners()
  const {
    app: { connectionState }
  } = useAppState()

  const headerOverridesProps: HeaderOverridesProps = useMemo(() => {
    const { isMainnet, isRinkeby, isGoerli } = isNetwork(l1.network)
    const className = isMainnet ? 'lg:bg-black' : 'lg:bg-blue-arbitrum'

    if (isRinkeby) {
      return { imageSrc: HeaderArbitrumLogoRinkeby, className }
    }

    if (isGoerli) {
      return { imageSrc: HeaderArbitrumLogoGoerli, className }
    }

    return { imageSrc: HeaderArbitrumLogoMainnet, className }
  }, [l1.network])

  if (connectionState === ConnectionState.SEQUENCER_UPDATE) {
    return (
      <Alert type="red">
        Note: The Arbitrum Sequencer Will be offline today 3pm-5pm EST for
        maintenance. Thanks for your patience!
      </Alert>
    )
  }

  if (connectionState === ConnectionState.NOT_EOA) {
    return (
      <Alert type="red">
        Looks like your wallet is connected to a contract; please connect to an
        externally owned account instead.
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
      <HeaderOverrides {...headerOverridesProps} />

      <HeaderContent>
        <HeaderNetworkInformation />
        <HeaderAccountPopover />
      </HeaderContent>

      <PendingTransactionsUpdater />
      <RetryableTxnsIncluder />
      <TokenListSyncer />
      <BalanceUpdater />
      <PWLoadedUpdater />

      <Notifications />
      <MainContent />
    </>
  )
}

const Injector = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const actions = useActions()

  const networksAndSigners = useNetworksAndSigners()
  const { currentL1BlockNumber } = useAppContextState()

  const [tokenBridgeParams, setTokenBridgeParams] =
    useState<TokenBridgeParams | null>(null)

  const { provider: library } = useWallet()

  const initBridge = useCallback(
    async (params: UseNetworksAndSignersConnectedResult) => {
      const { l1, l2 } = params
      const { signer: l1Signer, provider: l1Provider } = l1
      const { signer: l2Signer, provider: l2Provider } = l2

      const l1Address = await l1Signer.getAddress()
      const l2Address = await l2Signer.getAddress()

      try {
        const l1AddressIsEOA = await addressIsEOA(l1Address, l1Provider)
        const l2AddressIsEOA = await addressIsEOA(l2Address, l2Provider)

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

      setTokenBridgeParams({
        walletAddress: l1Address,
        l1: {
          network: l1.network,
          provider: l1.provider
        },
        l2: {
          network: l2.network,
          provider: l2.provider
        }
      })
    },
    []
  )

  useEffect(() => {
    if (currentL1BlockNumber > 0) {
      console.log('Current block number on L1:', currentL1BlockNumber)
    }
  }, [currentL1BlockNumber])

  // Listen for account and network changes
  useEffect(() => {
    // Any time one of those changes
    setTokenBridgeParams(null)
    actions.app.setConnectionState(ConnectionState.LOADING)
    if (networksAndSigners.status !== UseNetworksAndSignersStatus.CONNECTED) {
      return
    }

    const { l1, l2, isConnectedToArbitrum } = networksAndSigners
    const network = isConnectedToArbitrum ? l2.network : l1.network

    const l1NetworkChainId = l1.network.chainID
    const l2NetworkChainId = l2.network.chainID

    actions.app.reset(network.chainID)
    actions.app.setChainIds({ l1NetworkChainId, l2NetworkChainId })

    if (!isConnectedToArbitrum) {
      console.info('Deposit mode detected:')
      actions.app.setIsDepositMode(true)
      actions.app.setConnectionState(ConnectionState.L1_CONNECTED)
    } else {
      console.info('Withdrawal mode detected:')
      actions.app.setIsDepositMode(false)
      actions.app.setConnectionState(ConnectionState.L2_CONNECTED)
    }

    initBridge(networksAndSigners)
  }, [networksAndSigners, initBridge])

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
      async function logGasPrice() {
        console.log('Gas price:', await library?.getGasPrice())
      }

      const changeNetwork = async (network: L1Network | L2Network) => {
        const chainId = network.chainID
        const hexChainId = hexValue(BigNumber.from(chainId))
        const networkName = getNetworkName(network)
        const provider = library?.provider

        if (isSwitchChainSupported(provider)) {
          console.log('Attempting to switch to chain', chainId)
          try {
            // @ts-ignore
            await provider.request({
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
                `Network ${chainId} not yet added to wallet; adding now:`
              )
              // @ts-ignore
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: hexChainId,
                    chainName: networkName,
                    nativeCurrency: {
                      name: 'Ether',
                      symbol: 'ETH',
                      decimals: 18
                    },
                    rpcUrls: [network.rpcURL || rpcURLs[network.chainID]],
                    blockExplorerUrls: [network.explorerUrl]
                  }
                ]
              })
            } else {
              throw err
            }
          }
        } else {
          // if no `wallet_switchEthereumChain` support
          console.log(
            'Not sure if current provider supports wallet_switchEthereumChain'
          )
          // TODO: show user a nice dialogue box instead of
          // eslint-disable-next-line no-alert
          const targetTxName = networksAndSigners.isConnectedToArbitrum
            ? 'deposit'
            : 'withdraw'

          alert(
            `Please connect to ${networkName} to ${targetTxName}; make sure your wallet is connected to ${networkName} when you are signing your ${targetTxName} transaction.`
          )

          // TODO: reset state so user can attempt to press "Deposit" again
        }
      }

      logGasPrice()
      actions.app.setChangeNetwork(changeNetwork)
    }
  }, [library, networksAndSigners.isConnectedToArbitrum])

  return (
    <>
      {tokenBridgeParams && (
        <ArbTokenBridgeStoreSync tokenBridgeParams={tokenBridgeParams} />
      )}
      {children}
    </>
  )
}

function Routes() {
  const key = 'arbitrum:bridge:tos-v' + TOS_VERSION
  const [tosAccepted, setTosAccepted] = useLocalStorage<string>(key)
  const [welcomeDialogProps, openWelcomeDialog] = useDialog()

  const isTosAccepted = tosAccepted !== undefined

  useEffect(() => {
    if (!isTosAccepted) {
      openWelcomeDialog()
    }
  }, [isTosAccepted, openWelcomeDialog])

  function onClose(confirmed: boolean) {
    // Only close after confirming (agreeing to terms)
    if (confirmed) {
      setTosAccepted('true')
      welcomeDialogProps.onClose(confirmed)
    }
  }

  return (
    <Router>
      <WelcomeDialog {...welcomeDialogProps} onClose={onClose} />
      <Switch>
        <Route path="/tos" exact>
          <TermsOfService />
        </Route>

        <Route path="/" exact>
          <NetworkReady>
            <AppContextProvider>
              <BalanceProvider>
                <Injector>{isTosAccepted && <AppContent />}</Injector>
              </BalanceProvider>
            </AppContextProvider>
          </NetworkReady>
        </Route>

        <Route path="*">
          <div className="flex w-full flex-col items-center space-y-4 px-8 py-4 text-center lg:py-0">
            <span className="text-8xl text-white">404</span>
            <p className="text-3xl text-white">
              Page not found in this solar system
            </p>
            <img
              src="/images/arbinaut-fixing-spaceship.png"
              alt="Arbinaut fixing a spaceship"
              className="lg:max-w-md"
            />
          </div>
        </Route>
      </Switch>
    </Router>
  )
}

function NetworkReady({ children }: { children: React.ReactNode }) {
  const { search } = useLocation()

  const selectedL2ChainId = useMemo(() => {
    const searchParams = new URLSearchParams(search)
    const selectedL2ChainIdSearchParam = searchParams.get('l2ChainId')

    if (!selectedL2ChainIdSearchParam) {
      return undefined
    }

    return parseInt(selectedL2ChainIdSearchParam) || undefined
  }, [search])

  return (
    <NetworksAndSignersProvider
      selectedL2ChainId={selectedL2ChainId}
      fallback={status => <ConnectionFallback status={status} />}
    >
      {children}
    </NetworksAndSignersProvider>
  )
}

function ConnectionFallbackContainer({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mt-6 flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-8">
      {children}
      <ExternalLink href="https://metamask.io/download">
        <img
          className="sm:w-[420px]"
          src="/images/three-arbinauts.png"
          alt="Three Arbinauts"
        />
      </ExternalLink>
    </div>
  )
}

function ConnectionFallback({
  status
}: {
  status: UseNetworksAndSignersLoadingOrErrorStatus
}): JSX.Element {
  const { connect } = useWallet()

  async function showConnectionModal() {
    try {
      await connect(modalProviderOpts)
    } catch (error) {
      // Dialog was closed by user
    }
  }

  switch (status) {
    case UseNetworksAndSignersStatus.LOADING:
      return (
        <>
          <HeaderContent>
            <HeaderNetworkLoadingIndicator />
          </HeaderContent>

          <ConnectionFallbackContainer>
            <div className="absolute mt-20 sm:mt-24">
              <Loader type="TailSpin" color="white" height={44} width={44} />
            </div>
          </ConnectionFallbackContainer>
        </>
      )

    case UseNetworksAndSignersStatus.NOT_CONNECTED:
      return (
        <>
          <HeaderContent>
            <HeaderConnectWalletButton />
          </HeaderContent>

          <ConnectionFallbackContainer>
            <Button variant="primary" onClick={showConnectionModal}>
              Connect Wallet
            </Button>
          </ConnectionFallbackContainer>
        </>
      )

    case UseNetworksAndSignersStatus.NOT_SUPPORTED:
      return (
        <div className="flex w-full justify-center">
          <span className="py-24 text-2xl font-light text-blue-link text-white">
            You are on the wrong network.{' '}
            <ExternalLink
              href="https://arbitrum.io/bridge-tutorial"
              className="arb-hover underline"
            >
              Read our tutorial
            </ExternalLink>{' '}
            on how to switch networks.
          </span>
        </div>
      )
  }
}

export default function App() {
  const [overmind] = useState<Overmind<typeof config>>(createOvermind(config))

  return (
    <Provider value={overmind}>
      <Layout>
        <Routes />
      </Layout>
    </Provider>
  )
}
