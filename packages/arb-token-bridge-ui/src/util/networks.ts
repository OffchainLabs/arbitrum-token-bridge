import { L1Network, L2Network, addCustomNetwork } from '@arbitrum/sdk'
import {
  l1Networks,
  l2Networks
} from '@arbitrum/sdk/dist/lib/dataEntities/networks'
import { ExternalProvider, Web3Provider } from '@ethersproject/providers'

import { hexValue } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import * as Sentry from '@sentry/react'

import { loadEnvironmentVariableWithFallback } from './index'
import { isUserRejectedError } from './isUserRejectedError'

const INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY

if (typeof INFURA_KEY === 'undefined') {
  throw new Error('Infura API key not provided')
}

const MAINNET_INFURA_RPC_URL = `https://mainnet.infura.io/v3/${INFURA_KEY}`
const GOERLI_INFURA_RPC_URL = `https://goerli.infura.io/v3/${INFURA_KEY}`

export enum ChainId {
  // L1
  Mainnet = 1,
  // L1 Testnets
  /**
   * Rinkeby is deprecated, but we are keeping it in order to detect it and point to Goerli instead.
   */
  Rinkeby = 4,
  Goerli = 5,
  Local = 1337,
  Sepolia = 11155111,
  // L2
  ArbitrumOne = 42161,
  ArbitrumNova = 42170,
  // L2 Testnets
  /**
   * Arbitrum Rinkeby is deprecated, but we are keeping it in order to detect it and point to Arbitrum Goerli instead.
   */
  ArbitrumRinkeby = 421611,
  ArbitrumGoerli = 421613,
  ArbitrumLocal = 412346
}

type ExtendedWeb3Provider = Web3Provider & {
  provider: ExternalProvider & {
    isMetaMask?: boolean
    isImToken?: boolean
  }
}

export const rpcURLs: { [chainId: number]: string } = {
  // L1
  [ChainId.Mainnet]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
    fallback: MAINNET_INFURA_RPC_URL
  }),
  // L1 Testnets
  [ChainId.Goerli]: loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_GOERLI_RPC_URL,
    fallback: GOERLI_INFURA_RPC_URL
  }),
  // L2
  [ChainId.ArbitrumOne]: 'https://arb1.arbitrum.io/rpc',
  [ChainId.ArbitrumNova]: 'https://nova.arbitrum.io/rpc',
  // L2 Testnets
  [ChainId.ArbitrumGoerli]: 'https://goerli-rollup.arbitrum.io/rpc'
}

export const explorerUrls: { [chainId: number]: string } = {
  // L1
  [ChainId.Mainnet]: 'https://etherscan.io',
  // L1 Testnets
  [ChainId.Goerli]: 'https://goerli.etherscan.io',
  // L2
  [ChainId.ArbitrumNova]: 'https://nova.arbiscan.io',
  [ChainId.ArbitrumOne]: 'https://arbiscan.io',
  // L2 Testnets
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
  [ChainId.ArbitrumNova]: '0x10E6593CDda8c58a1d0f14C5164B376352a55f2F'
}

export const l2wstETHGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumOne]: '0x07d4692291b9e30e326fd31706f686f83f331b82'
}

export const l2LptGatewayAddresses: { [chainId: number]: string } = {
  [ChainId.ArbitrumOne]: '0x6D2457a4ad276000A615295f7A80F79E48CcD318'
}

// Default L2 Chain to use for a certain chainId
export const chainIdToDefaultL2ChainId: { [chainId: number]: ChainId[] } = {
  // L1
  [ChainId.Mainnet]: [ChainId.ArbitrumOne, ChainId.ArbitrumNova],
  // L1 Testnets
  [ChainId.Goerli]: [ChainId.ArbitrumGoerli],
  // L2
  [ChainId.ArbitrumOne]: [ChainId.ArbitrumOne],
  [ChainId.ArbitrumNova]: [ChainId.ArbitrumNova],
  // L2 Testnets
  [ChainId.ArbitrumGoerli]: [ChainId.ArbitrumGoerli]
}

const defaultL1Network: L1Network = {
  blockTime: 10,
  chainID: 1337,
  explorerUrl: '',
  isCustom: true,
  name: 'EthLocal',
  partnerChainIDs: [412346],
  isArbitrum: false
}

const defaultL2Network: L2Network = {
  chainID: 412346,
  confirmPeriodBlocks: 20,
  ethBridge: {
    bridge: '0x2b360a9881f21c3d7aa0ea6ca0de2a3341d4ef3c',
    inbox: '0xff4a24b22f94979e9ba5f3eb35838aa814bad6f1',
    outbox: '0x49940929c7cA9b50Ff57a01d3a92817A414E6B9B',
    rollup: '0x65a59d67da8e710ef9a01eca37f83f84aedec416',
    sequencerInbox: '0xe7362d0787b51d8c72d504803e5b1d6dcda89540'
  },
  explorerUrl: '',
  isArbitrum: true,
  isCustom: true,
  name: 'ArbLocal',
  partnerChainID: 1337,
  retryableLifetimeSeconds: 604800,
  nitroGenesisBlock: 0,
  nitroGenesisL1Block: 0,
  depositTimeout: 900000,
  tokenBridge: {
    l1CustomGateway: '0x3DF948c956e14175f43670407d5796b95Bb219D8',
    l1ERC20Gateway: '0x4A2bA922052bA54e29c5417bC979Daaf7D5Fe4f4',
    l1GatewayRouter: '0x525c2aBA45F66987217323E8a05EA400C65D06DC',
    l1MultiCall: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48',
    l1ProxyAdmin: '0xe1080224B632A93951A7CFA33EeEa9Fd81558b5e',
    l1Weth: '0x408Da76E87511429485C32E4Ad647DD14823Fdc4',
    l1WethGateway: '0xF5FfD11A55AFD39377411Ab9856474D2a7Cb697e',
    l2CustomGateway: '0x525c2aBA45F66987217323E8a05EA400C65D06DC',
    l2ERC20Gateway: '0xe1080224B632A93951A7CFA33EeEa9Fd81558b5e',
    l2GatewayRouter: '0x1294b86822ff4976BfE136cB06CF43eC7FCF2574',
    l2Multicall: '0xDB2D15a3EB70C347E0D2C2c7861cAFb946baAb48',
    l2ProxyAdmin: '0xda52b25ddB0e3B9CC393b0690Ac62245Ac772527',
    l2Weth: '0x408Da76E87511429485C32E4Ad647DD14823Fdc4',
    l2WethGateway: '0x4A2bA922052bA54e29c5417bC979Daaf7D5Fe4f4'
  }
}

export type RegisterLocalNetworkParams = {
  l1Network: L1Network
  l2Network: L2Network
}

const registerLocalNetworkDefaultParams: RegisterLocalNetworkParams = {
  l1Network: defaultL1Network,
  l2Network: defaultL2Network
}

export function registerLocalNetwork(
  params: RegisterLocalNetworkParams = registerLocalNetworkDefaultParams
) {
  const { l1Network, l2Network } = params

  const l1NetworkRpcUrl = loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_LOCAL_ETHEREUM_RPC_URL,
    fallback: 'http://localhost:8545'
  })
  const l2NetworkRpcUrl = loadEnvironmentVariableWithFallback({
    env: process.env.NEXT_PUBLIC_LOCAL_ARBITRUM_RPC_URL,
    fallback: 'http://localhost:8547'
  })

  try {
    rpcURLs[l1Network.chainID] = l1NetworkRpcUrl
    rpcURLs[l2Network.chainID] = l2NetworkRpcUrl

    chainIdToDefaultL2ChainId[l1Network.chainID] = [l2Network.chainID]
    chainIdToDefaultL2ChainId[l2Network.chainID] = [l2Network.chainID]

    addCustomNetwork({ customL1Network: l1Network, customL2Network: l2Network })
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

    case ChainId.Goerli:
      return 'Goerli'

    case ChainId.Local:
      return 'Ethereum'

    case ChainId.ArbitrumOne:
      return 'Arbitrum One'

    case ChainId.ArbitrumNova:
      return 'Arbitrum Nova'

    case ChainId.ArbitrumGoerli:
      return 'Arbitrum Goerli'

    case ChainId.ArbitrumLocal:
      return 'Arbitrum'

    default:
      return 'Unknown'
  }
}

export function getNetworkLogo(chainId: number) {
  switch (chainId) {
    // L1 networks
    case ChainId.Mainnet:
    case ChainId.Goerli:
      return '/EthereumLogo.webp'

    // L2 networks
    case ChainId.ArbitrumOne:
    case ChainId.ArbitrumGoerli:
      return '/ArbitrumOneLogo.svg'

    case ChainId.ArbitrumNova:
      return '/ArbitrumNovaLogo.svg'

    default:
      return '/EthereumLogo.webp'
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
    if (isUserRejectedError(err)) {
      onError?.(err)
      return
    }

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
        if (isUserRejectedError(err)) {
          return
        }
        Sentry.captureException(err)
      }

      onSuccess?.()
    } else {
      onError?.(err)
      Sentry.captureException(err)
    }
  }
}
