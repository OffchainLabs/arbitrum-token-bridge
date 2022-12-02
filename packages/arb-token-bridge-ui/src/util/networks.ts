import { L1Network, L2Network, addCustomNetwork } from '@arbitrum/sdk'
import {
  l1Networks,
  l2Networks
} from '@arbitrum/sdk/dist/lib/dataEntities/networks'
import { ExternalProvider, Web3Provider } from '@ethersproject/providers'

import { hexValue } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import * as Sentry from '@sentry/react'

import EthereumLogo from '../assets/EthereumLogo.webp'
import ArbitrumOneLogo from '../assets/ArbitrumOneLogo.svg'
import ArbitrumNovaLogo from '../assets/ArbitrumNovaLogo.webp'

const INFURA_KEY = process.env.REACT_APP_INFURA_KEY as string

if (!INFURA_KEY) {
  throw new Error('Infura API key not provided')
}

export enum ChainId {
  Mainnet = 1,
  Rinkeby = 4,
  Goerli = 5,
  Sepolia = 11155111,
  ArbitrumOne = 42161,
  ArbitrumNova = 42170,
  ArbitrumRinkeby = 421611,
  ArbitrumGoerli = 421613
}

type ExtendedWeb3Provider = Web3Provider & {
  provider: ExternalProvider & {
    isMetaMask?: boolean
    isImToken?: boolean
  }
}

export const rpcURLs: { [chainId: number]: string } = {
  // L1
  [ChainId.Mainnet]:
    process.env.REACT_APP_ETHEREUM_RPC_URL ||
    `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  // L1 Testnets
  [ChainId.Rinkeby]:
    process.env.REACT_APP_RINKEBY_RPC_URL ||
    `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
  [ChainId.Goerli]:
    process.env.REACT_APP_GOERLI_RPC_URL ||
    `https://goerli.infura.io/v3/${INFURA_KEY}`,
  // L2
  [ChainId.ArbitrumOne]: 'https://arb1.arbitrum.io/rpc',
  [ChainId.ArbitrumNova]: 'https://nova.arbitrum.io/rpc',
  // L2 Testnets
  [ChainId.ArbitrumRinkeby]: 'https://rinkeby.arbitrum.io/rpc',
  [ChainId.ArbitrumGoerli]: 'https://goerli-rollup.arbitrum.io/rpc'
}

export const explorerUrls: { [chainId: number]: string } = {
  // L1
  [ChainId.Mainnet]: 'https://etherscan.io',
  // L1 Testnets
  [ChainId.Goerli]: 'https://goerli.etherscan.io',
  [ChainId.Rinkeby]: 'https://rinkeby.etherscan.io',
  //L2
  [ChainId.ArbitrumNova]: 'https://nova.arbiscan.io',
  [ChainId.ArbitrumOne]: 'https://arbiscan.io',
  // L2 Testnets
  [ChainId.ArbitrumRinkeby]: 'https://testnet.arbiscan.io',
  [ChainId.ArbitrumGoerli]: 'https://goerli.arbiscan.io'
}

export const getExplorerUrl = (chainId: ChainId) => {
  return explorerUrls[chainId] ?? explorerUrls[ChainId.Mainnet] //defaults to etherscan
}

export const getBlockTime = (chainId: ChainId) => {
  const network = l1Networks[chainId]
  if (!network) {
    throw new Error(`Couldn't get block time. Unexpected chain ID: ${chainId}`)
  }
  return network.blockTime
}

export const getConfirmPeriodBlocks = (chainId: ChainId) => {
  const network = l2Networks[chainId]
  if (!network) {
    throw new Error(
      `Couldn't get confirm period blocks. Unexpected chain ID: ${chainId}`
    )
  }
  return network.confirmPeriodBlocks
}

export const l2DaiGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumOne]: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65',
  [ChainId.ArbitrumNova]: '0x10E6593CDda8c58a1d0f14C5164B376352a55f2F',
  [ChainId.ArbitrumRinkeby]: '0x467194771dAe2967Aef3ECbEDD3Bf9a310C76C65'
}

export const l2wstETHGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumRinkeby]: '0x65321bf24210b81500230dcece14faa70a9f50a7',
  [ChainId.ArbitrumOne]: '0x07d4692291b9e30e326fd31706f686f83f331b82'
}

export const l2LptGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumOne]: '0x6D2457a4ad276000A615295f7A80F79E48CcD318'
}

// Default L2 Chain to use for a certain chainId
export const chainIdToDefaultL2ChainId: { [chainId: number]: ChainId[] } = {
  [ChainId.ArbitrumGoerli]: [ChainId.ArbitrumGoerli],
  [ChainId.ArbitrumNova]: [ChainId.ArbitrumNova],
  [ChainId.ArbitrumOne]: [ChainId.ArbitrumOne],
  [ChainId.ArbitrumRinkeby]: [ChainId.ArbitrumRinkeby],
  [ChainId.Goerli]: [ChainId.ArbitrumGoerli],
  [ChainId.Mainnet]: [ChainId.ArbitrumOne, ChainId.ArbitrumNova],
  [ChainId.Rinkeby]: [ChainId.ArbitrumRinkeby]
}

export function registerLocalNetwork() {
  let localNetwork: {
    l1Network: L1Network
    l2Network: L2Network
  }

  try {
    // Generate the "localNetwork.json" file by running "yarn gen:network" in @arbitrum/sdk and then copy it over.
    localNetwork = require('./localNetwork.json')
  } catch (error) {
    return console.warn(
      `Skipping local network registration as no "localNetwork.json" file was found.`
    )
  }

  try {
    const customL1Network = localNetwork.l1Network
    const customL2Network = localNetwork.l2Network

    rpcURLs[customL1Network.chainID] =
      process.env.REACT_APP_LOCAL_ETHEREUM_RPC_URL || ''
    rpcURLs[customL2Network.chainID] =
      process.env.REACT_APP_LOCAL_ARBITRUM_RPC_URL || ''

    chainIdToDefaultL2ChainId[customL1Network.chainID] = [
      customL2Network.chainID
    ]
    chainIdToDefaultL2ChainId[customL2Network.chainID] = [
      customL2Network.chainID
    ]

    addCustomNetwork({ customL1Network, customL2Network })
  } catch (error: any) {
    console.error(`Failed to register local network: ${error.message}`)
  }
}

export function isNetwork(chainId: ChainId) {
  const isMainnet = chainId === ChainId.Mainnet

  const isRinkeby = chainId === ChainId.Rinkeby
  const isGoerli = chainId === ChainId.Goerli
  const isSepolia = chainId === ChainId.Sepolia

  const isArbitrumOne = chainId === ChainId.ArbitrumOne
  const isArbitrumNova = chainId === ChainId.ArbitrumNova
  const isArbitrumGoerli = chainId === ChainId.ArbitrumGoerli
  const isArbitrumRinkeby = chainId === ChainId.ArbitrumRinkeby

  const isArbitrum =
    isArbitrumOne || isArbitrumNova || isArbitrumGoerli || isArbitrumRinkeby

  const isTestnet =
    isRinkeby || isGoerli || isArbitrumGoerli || isArbitrumRinkeby || isSepolia

  return {
    // L1
    isMainnet,
    isEthereum: !isArbitrum,
    // L1 Testnets
    isRinkeby,
    isGoerli,
    isSepolia,
    // L2
    isArbitrum,
    isArbitrumOne,
    isArbitrumNova,
    // L2 Testnets
    isArbitrumRinkeby,
    isArbitrumGoerli,
    // Testnet
    isTestnet
  }
}

export function getNetworkName(chainId: number) {
  switch (chainId) {
    case ChainId.Mainnet:
      return 'Mainnet'

    case ChainId.Rinkeby:
      return 'Rinkeby'

    case ChainId.Goerli:
      return 'Goerli'

    case ChainId.ArbitrumOne:
      return 'Arbitrum One'

    case ChainId.ArbitrumNova:
      return 'Arbitrum Nova'

    case ChainId.ArbitrumRinkeby:
      return 'Arbitrum Rinkeby'

    case ChainId.ArbitrumGoerli:
      return 'Arbitrum Goerli'

    default:
      return 'Unknown'
  }
}

export function getNetworkLogo(chainId: number) {
  switch (chainId) {
    // L1 networks
    case ChainId.Mainnet:
    case ChainId.Rinkeby:
    case ChainId.Goerli:
      return EthereumLogo

    // L2 networks
    case ChainId.ArbitrumOne:
    case ChainId.ArbitrumRinkeby:
    case ChainId.ArbitrumGoerli:
      return ArbitrumOneLogo

    case ChainId.ArbitrumNova:
      return ArbitrumNovaLogo

    default:
      return EthereumLogo
  }
}

export type SwitchChainProps = {
  chainId: number
  provider: ExtendedWeb3Provider
  onSuccess?: () => void
  onError?: (err?: Error) => void
  onSwitchChainNotSupported?: (attemptedChainId: number) => void
}

const isSwitchChainSupported = (provider: ExtendedWeb3Provider) => {
  const { provider: innerProvider } = provider
  return innerProvider.isMetaMask || innerProvider.isImToken
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}

const onSwitchChainNotSupportedDefault = (attemptedChainId: number) => {
  const isDeposit = isNetwork(attemptedChainId).isEthereum
  const targetTxName = isDeposit ? 'deposit' : 'withdraw'
  const networkName = getNetworkName(attemptedChainId)

  // TODO: show user a nice dialogue box instead of
  // eslint-disable-next-line no-alert
  alert(
    `Please connect to ${networkName} to ${targetTxName}; make sure your wallet is connected to ${networkName} when you are signing your ${targetTxName} transaction.`
  )
}

export async function switchChain({
  chainId,
  provider,
  onSuccess = noop,
  onError = noop,
  onSwitchChainNotSupported = onSwitchChainNotSupportedDefault
}: SwitchChainProps) {
  // do an early return if switching-chains is not supported by provider
  if (!isSwitchChainSupported(provider)) {
    onSwitchChainNotSupported?.(chainId)
    return
  }

  // if all the above conditions are satisfied go ahead and switch the network
  const hexChainId = hexValue(BigNumber.from(chainId))
  const networkName = getNetworkName(chainId)

  try {
    await provider.send('wallet_switchEthereumChain', [
      {
        chainId: hexChainId
      }
    ])

    onSuccess?.()
  } catch (err: any) {
    if (err.code === 4902) {
      // https://docs.metamask.io/guide/rpc-api.html#usage-with-wallet-switchethereumchain
      // This error code indicates that the chain has not been added to MetaMask.

      try {
        await provider.send('wallet_addEthereumChain', [
          {
            chainId: hexChainId,
            chainName: networkName,
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: [rpcURLs[chainId]],
            blockExplorerUrls: [getExplorerUrl(chainId)]
          }
        ])
      } catch (err: any) {
        onError?.(err)
        Sentry.captureException(err)
      }

      onSuccess?.()
    } else {
      onError?.(err)
      Sentry.captureException(err)
    }
  }
}
