import { l2Networks } from '@arbitrum/sdk/dist/lib/dataEntities/networks'
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

export const orbitMainnets = orbitMainnetsJson as {
  [key in number]: OrbitChainConfig
}

export const orbitTestnets = orbitTestnetsJson as {
  [key in number]: OrbitChainConfig
}

export const orbitChains = { ...orbitMainnets, ...orbitTestnets }

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

export function getInboxAddressFromOrbitChainId(chainId: number) {
  return (
    l2Networks[chainId]?.ethBridge.inbox ?? // for stylus testnet v2
    getOrbitChains().find(chain => chain.chainID === chainId)?.ethBridge.inbox // for other custom orbit chains
  )
}

export function getChainIdFromInboxAddress(inboxAddress: string) {
  return getOrbitChains().find(
    chain => chain.ethBridge.inbox.toLowerCase() === inboxAddress.toLowerCase()
  )?.chainID
}
