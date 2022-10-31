import { L1Network, L2Network, addCustomNetwork } from '@arbitrum/sdk'
import {
  l1Networks,
  l2Networks
} from '@arbitrum/sdk/dist/lib/dataEntities/networks'

import { hexValue } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'

import EthereumLogo from '../assets/EthereumLogo.png'
import ArbitrumOneLogo from '../assets/ArbitrumOneLogo.svg'
import ArbitrumNovaLogo from '../assets/ArbitrumNovaLogo.png'
import { Web3Provider } from '@ethersproject/providers'

const INFURA_KEY = process.env.REACT_APP_INFURA_KEY as string

if (!INFURA_KEY) {
  throw new Error('Infura API key not provided')
}

export enum ChainId {
  Mainnet = 1,
  Rinkeby = 4,
  Goerli = 5,
  ArbitrumOne = 42161,
  ArbitrumNova = 42170,
  ArbitrumRinkeby = 421611,
  ArbitrumGoerli = 421613
}

type ExtendedWeb3Provider = Web3Provider & {
  isMetaMask?: boolean
  isImToken?: boolean
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
  const isArbitrum =
    chainId === ChainId.ArbitrumOne ||
    chainId === ChainId.ArbitrumNova ||
    chainId === ChainId.ArbitrumGoerli ||
    chainId === ChainId.ArbitrumRinkeby

  const isTestnet =
    chainId === ChainId.Rinkeby ||
    chainId === ChainId.Goerli ||
    chainId === ChainId.ArbitrumGoerli ||
    chainId === ChainId.ArbitrumRinkeby

  return {
    // L1
    isMainnet: chainId === ChainId.Mainnet,
    isEthereum: !isArbitrum,
    // L1 Testnets
    isRinkeby: chainId === ChainId.Rinkeby,
    isGoerli: chainId === ChainId.Goerli,
    // L2
    isArbitrum,
    isArbitrumOne: chainId === ChainId.ArbitrumOne,
    isArbitrumNova: chainId === ChainId.ArbitrumNova,
    // L2 Testnets
    isArbitrumRinkeby: chainId === ChainId.ArbitrumRinkeby,
    isArbitrumGoerliRollup: chainId === ChainId.ArbitrumGoerli,
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
      return EthereumLogo

    case ChainId.Rinkeby:
      return EthereumLogo

    case ChainId.Goerli:
      return EthereumLogo

    // L2 networks
    case ChainId.ArbitrumOne:
      return ArbitrumOneLogo

    case ChainId.ArbitrumNova:
      return ArbitrumNovaLogo

    case ChainId.ArbitrumRinkeby:
      return ArbitrumOneLogo

    case ChainId.ArbitrumGoerli:
      return ArbitrumOneLogo

    default:
      return EthereumLogo
  }
}

export const getSupportedNetworks = (chainId?: number) => {
  // The list which will be available for network selection in navbar-dropdowns and unsupported-network-content
  // If there is a chainId selected, it detects if it's a testnet and shows only those options

  const mainNetworks = [
    ChainId.ArbitrumOne,
    ChainId.ArbitrumNova,
    ChainId.Mainnet
  ]
  const testNetworks = [ChainId.ArbitrumGoerli, ChainId.Goerli]
  const isTestnet = chainId ? isNetwork(chainId).isTestnet : false
  return isTestnet ? testNetworks : mainNetworks
}

export type SwitchChainProps = {
  chainId: number
  provider: ExtendedWeb3Provider
  onSuccess?: () => void
  onError?: (err?: Error) => void
  onSwitchChainNotSupported?: () => void
}

const isSwitchChainSupported = (provider: ExtendedWeb3Provider) => {
  const { provider: innerProvider } = provider
  // @ts-ignore : `isImToken` is not exported by default in metamask
  return innerProvider?.isMetaMask || innerProvider?.isImToken
}

const noop = () => {}

export async function switchChain({
  chainId,
  provider,
  onSuccess = noop,
  onError = noop,
  onSwitchChainNotSupported = noop
}: SwitchChainProps) {
  // do an early return if switching-chains is not supported by provider
  if (!isSwitchChainSupported(provider)) {
    onSwitchChainNotSupported?.()
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

      onSuccess?.()
    } else {
      onError?.(err)
    }
  }
}
