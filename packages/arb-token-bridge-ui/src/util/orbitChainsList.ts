import { NativeCurrencyBase } from '../hooks/useNativeCurrency'
import { ChainId } from '../types/ChainId'
import { addressesEqual } from './AddressUtils'
import { isE2eTestingEnvironment } from './CommonUtils'
import { ChainWithRpcUrl } from './networks'
import orbitChainsData from './orbitChainsData.json'

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
  nativeTokenData?: Omit<NativeCurrencyBase, 'decimals'>
  fastWithdrawalTime?: number
}

export type OrbitChainConfig = ChainWithRpcUrl & {
  bridgeUiConfig: BridgeUiConfig
}

type OrbitChainsData = {
  mainnet: OrbitChainConfig[]
  testnet: OrbitChainConfig[]
}

const typedOrbitChainsData = orbitChainsData as OrbitChainsData

const convertArrayToObject = (
  array: OrbitChainConfig[]
): { [key: number]: OrbitChainConfig } => {
  return array.reduce(
    (acc, chain) => {
      acc[chain.chainId] = chain
      return acc
    },
    {} as { [key: number]: OrbitChainConfig }
  )
}

export const orbitMainnets: {
  [key: number]: OrbitChainConfig
} = convertArrayToObject(typedOrbitChainsData.mainnet)

export const orbitTestnets: {
  [key: number]: OrbitChainConfig
} = convertArrayToObject(typedOrbitChainsData.testnet)

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
  if (isE2eTestingEnvironment) {
    // During E2E tests, only return local chains
    return Object.values(orbitChains).filter(
      chain => chain.chainId === ChainId.L3Local
    )
  }

  const mainnetChains = mainnet ? Object.values(orbitMainnets) : []
  const testnetChains = testnet ? Object.values(orbitTestnets) : []

  return [...mainnetChains, ...testnetChains]
}

export function getInboxAddressFromOrbitChainId(chainId: number) {
  return (
    getOrbitChains()
      //
      .find(chain => chain.chainId === chainId)?.ethBridge.inbox
  )
}

export function getChainIdFromInboxAddress(inboxAddress: string) {
  return getOrbitChains().find(chain =>
    addressesEqual(chain.ethBridge.inbox, inboxAddress)
  )?.chainId
}
