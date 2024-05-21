import { z } from 'zod'
import { isAddress } from 'ethers/lib/utils.js'

import { NativeCurrencyBase } from '../../hooks/useNativeCurrency'
import { ChainWithRpcUrl } from './../networks'
import orbitMainnetsJson from './orbitMainnets.json'
import orbitTestnetsJson from './orbitTestnets.json'

let validated = false

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

type OrbitChainConfig = ChainWithRpcUrl & { bridgeUiConfig: BridgeUiConfig }

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

  if (!validated) {
    chains.forEach(validateOrbitChain)
    validated = true
  }

  return chains
}

const zAddress = z
  .string()
  .refine(address => isAddress(address), 'Invalid address')

function validateOrbitChain(chain: OrbitChainConfig) {
  z.object({
    chainID: z.number().nonnegative().int(),
    confirmPeriodBlocks: z.number().nonnegative().int(),
    ethBridge: z.object({
      bridge: zAddress,
      inbox: zAddress,
      outbox: zAddress,
      rollup: zAddress,
      sequencerInbox: zAddress
    }),
    nativeToken: zAddress.optional(),
    explorerUrl: z.string(),
    rpcUrl: z.string(),
    isArbitrum: z.boolean(),
    isCustom: z.boolean(),
    name: z.string(),
    slug: z.string(),
    partnerChainID: z.number().nonnegative().int(),
    partnerChainIDs: z.array(z.number()),
    retryableLifetimeSeconds: z.number().nonnegative().int(),
    blockTime: z.number().nonnegative(),
    tokenBridge: z.object({
      l1CustomGateway: zAddress,
      l1ERC20Gateway: zAddress,
      l1GatewayRouter: zAddress,
      l1MultiCall: zAddress,
      l1ProxyAdmin: zAddress,
      l1Weth: zAddress,
      l1WethGateway: zAddress,
      l2CustomGateway: zAddress,
      l2ERC20Gateway: zAddress,
      l2GatewayRouter: zAddress,
      l2Multicall: zAddress,
      l2ProxyAdmin: zAddress,
      l2Weth: zAddress,
      l2WethGateway: zAddress
    }),
    nitroGenesisBlock: z.number().nonnegative().int(),
    nitroGenesisL1Block: z.number().nonnegative().int(),
    depositTimeout: z.number().nonnegative().int(),
    bridgeUiConfig: z.object({
      color: z.string(),
      network: z.object({
        name: z.string(),
        logo: z.string(),
        description: z.string()
      }),
      nativeTokenData: z
        .object({
          name: z.string(),
          symbol: z.string(),
          decimals: z.number().nonnegative().int(),
          logoUrl: z.string()
        })
        .optional()
    })
  }).parse(chain)
}
