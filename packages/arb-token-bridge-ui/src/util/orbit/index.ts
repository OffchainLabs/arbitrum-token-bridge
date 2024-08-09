import { NativeCurrencyBase } from '../../hooks/useNativeCurrency'
import { ChainWithRpcUrl } from './../networks'
import orbitMainnetsJson from './orbitMainnets.json'
import orbitTestnetsJson from './orbitTestnets.json'

export type NetworkType =
  | 'Ethereum'
  | 'Rollup'
  | 'AnyTrust'
  | 'Ethereum Testnet'
  | 'Arbitrum Testnet'

export type BridgeUiConfig = {
  color: `#${string}`
  network: {
    name: string
    logo: string
    description?: string
  }
  nativeTokenData?: NativeCurrencyBase
}

export type OrbitChainConfig = ChainWithRpcUrl & {
  bridgeUiConfig: BridgeUiConfig
}

const orbitMainnets = orbitMainnetsJson as {
  [key in number]: OrbitChainConfig
}

const orbitTestnets = orbitTestnetsJson as {
  [key in number]: OrbitChainConfig
}

export function getOrbitChains(
  {
    mainnet,
    testnet
  }: {
    mainnet: boolean
    testnet: boolean
  } = { mainnet: true, testnet: true }
): OrbitChainConfig[] {
  const mainnetChains = mainnet ? Object.values(orbitMainnets) : []
  const testnetChains = testnet ? Object.values(orbitTestnets) : []

  const chains = [...mainnetChains, ...testnetChains]

  return chains
}

export function getOrbitChain(chainId: number) {
  return getOrbitChains().find(chain => chain.chainId === chainId)
}

export function getInboxAddressFromOrbitChainId(chainId: number) {
  return (
    getOrbitChains()
      //
      .find(chain => chain.chainId === chainId)?.ethBridge.inbox
  )
}

export function getChainIdFromInboxAddress(inboxAddress: string) {
  return getOrbitChains().find(
    chain => chain.ethBridge.inbox.toLowerCase() === inboxAddress.toLowerCase()
  )?.chainId
}
