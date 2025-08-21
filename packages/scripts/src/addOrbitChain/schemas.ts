import { z } from 'zod'
import { constants } from 'ethers'
import { warning } from '@actions/core'
import { getOctokit } from '@actions/github'
import path from 'path'
import * as dotenv from 'dotenv'
import { getProvider } from './provider'

// Load .env from the UI project directory
dotenv.config({
  path: path.resolve(__dirname, '../../../arb-token-bridge-ui/.env')
})
export const TESTNET_PARENT_CHAIN_IDS = [11155111, 421614, 84532]
const ZERO_ADDRESS = constants.AddressZero

export const getParentChainInfo = (parentChainId: number) => {
  const INFURA_KEY = process.env.NEXT_PUBLIC_INFURA_KEY

  switch (parentChainId) {
    case 1: // Ethereum Mainnet
      return {
        rpcUrl: INFURA_KEY
          ? `https://mainnet.infura.io/v3/${INFURA_KEY}`
          : 'https://eth.llamarpc.com',
        blockExplorer: 'https://etherscan.io',
        chainId: 1,
        name: 'Ethereum'
      }
    case 42161: // Arbitrum One
      return {
        rpcUrl: INFURA_KEY
          ? `https://arbitrum-mainnet.infura.io/v3/${INFURA_KEY}`
          : 'https://arb1.arbitrum.io/rpc',
        blockExplorer: 'https://arbiscan.io',
        chainId: 42161,
        name: 'Arbitrum One'
      }
    case 42170: // Arbitrum Nova
      return {
        rpcUrl: 'https://nova.arbitrum.io/rpc',
        blockExplorer: 'https://nova.arbiscan.io',
        chainId: 42170,
        name: 'Arbitrum Nova'
      }
    case 11155111: // Sepolia
      return {
        rpcUrl: INFURA_KEY
          ? `https://sepolia.infura.io/v3/${INFURA_KEY}`
          : 'https://ethereum-sepolia-rpc.publicnode.com',
        blockExplorer: 'https://sepolia.etherscan.io',
        chainId: 11155111,
        name: 'Sepolia'
      }
    case 421614: // Arbitrum Sepolia
      return {
        rpcUrl: INFURA_KEY
          ? `https://arbitrum-sepolia.infura.io/v3/${INFURA_KEY}`
          : 'https://sepolia-rollup.arbitrum.io/rpc',
        blockExplorer: 'https://sepolia.arbiscan.io',
        chainId: 421614,
        name: 'Arbitrum Sepolia'
      }
    case 8453: // Base
      return {
        rpcUrl: 'https://mainnet.base.org',
        blockExplorer: 'https://basescan.io',
        chainId: 8453,
        name: 'Base'
      }
    case 84532: // Base Sepolia
      return {
        rpcUrl: 'https://sepolia.base.org',
        blockExplorer: 'https://sepolia.basescan.io',
        chainId: 84532,
        name: 'Base Sepolia'
      }
    default:
      throw new Error(`Unsupported parent chain ID: ${parentChainId}`)
  }
}

export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export const addressSchema = z.string().refine(isValidAddress, {
  message: 'Invalid Ethereum address'
})

export const urlSchema = z
  .string()
  .url({ message: 'Invalid URL format.' })
  .refine(url => url.startsWith('https://'), {
    message: 'URL must start with https://.'
  })
  .transform(url => (url.endsWith('/') ? url.slice(0, -1) : url))

export const colorHexSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color hex')

export const descriptionSchema = z
  .string()
  .optional()
  .transform(desc => {
    if (!desc) {
      return desc
    }
    return desc.endsWith('.') ? desc : `${desc}.`
  })

export const ethBridgeSchema = z.object({
  bridge: addressSchema,
  inbox: addressSchema,
  outbox: addressSchema,
  rollup: addressSchema,
  sequencerInbox: addressSchema
})

export const tokenBridgeSchema = z.object({
  parentCustomGateway: addressSchema,
  parentErc20Gateway: addressSchema,
  parentGatewayRouter: addressSchema,
  parentMultiCall: addressSchema.optional(),
  parentProxyAdmin: addressSchema.optional().default(ZERO_ADDRESS),
  parentWeth: addressSchema,
  parentWethGateway: addressSchema,
  childCustomGateway: addressSchema,
  childErc20Gateway: addressSchema,
  childGatewayRouter: addressSchema,
  childMultiCall: addressSchema.optional(),
  childProxyAdmin: addressSchema.optional().default(ZERO_ADDRESS),
  childWeth: addressSchema,
  childWethGateway: addressSchema
})

export const bridgeUiConfigSchema = z.object({
  color: colorHexSchema,
  network: z.object({
    name: z.string().min(1),
    logo: z.string().optional(),
    description: descriptionSchema
  }),
  nativeTokenData: z
    .object({
      name: z.string().min(1),
      symbol: z.string().min(1),
      logoUrl: z.string().optional()
    })
    .optional(),
  fastWithdrawalTime: z.number().int().positive().optional()
})

export const chainSchema = z
  .object({
    chainId: z.number().int().positive(),
    confirmPeriodBlocks: z.number().int().positive(),
    ethBridge: ethBridgeSchema,
    nativeToken: addressSchema.optional(),
    explorerUrl: urlSchema,
    rpcUrl: urlSchema,
    isCustom: z.boolean().default(true),
    isTestnet: z.boolean(),
    name: z.string().min(1),
    slug: z.string().min(1),
    parentChainId: z.number().int().positive(),
    tokenBridge: tokenBridgeSchema,
    bridgeUiConfig: bridgeUiConfigSchema
  })
  .superRefine(async (chain, ctx) => {
    const parentChainInfo = getParentChainInfo(chain.parentChainId)

    const parentAddressesToCheck = [
      chain.ethBridge.bridge,
      chain.ethBridge.inbox,
      chain.ethBridge.outbox,
      chain.ethBridge.rollup,
      chain.ethBridge.sequencerInbox,
      chain.tokenBridge.parentCustomGateway,
      chain.tokenBridge.parentErc20Gateway,
      chain.tokenBridge.parentGatewayRouter,
      chain.tokenBridge.parentMultiCall,
      chain.tokenBridge.parentWeth,
      chain.tokenBridge.parentWethGateway
    ].filter(
      (address): address is string =>
        typeof address === 'string' && address !== ZERO_ADDRESS
    )

    const childAddressesToCheck = [
      chain.tokenBridge.childCustomGateway,
      chain.tokenBridge.childErc20Gateway,
      chain.tokenBridge.childGatewayRouter,
      chain.tokenBridge.childMultiCall
    ].filter(
      (address): address is string =>
        typeof address === 'string' && address !== ZERO_ADDRESS
    )

    const checkAddresses = async (
      addresses: string[],
      rpcUrl: string,
      blockExplorer: string,
      chainId: number,
      chainName: string
    ) => {
      const provider = getProvider({ rpcUrl, name: chainName, chainId })

      for (const address of addresses) {
        try {
          const code = await provider.getCode(address)
          if (code === '0x') {
            throw new Error('Address is not a contract')
          }
        } catch (error) {
          const explorerLink = `${blockExplorer}/address/${address}`
          const warningMsg = `
Failed to verify contract at ${address} on ${chainName}

Please verify contract manually by visiting ${explorerLink}`
          console.error(warningMsg + `\n\n==================\n\n${error}`)
          warning(warningMsg)

          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: warningMsg
          })
        }
      }
    }

    chain.isTestnet = TESTNET_PARENT_CHAIN_IDS.includes(chain.parentChainId)

    await checkAddresses(
      parentAddressesToCheck,
      parentChainInfo.rpcUrl,
      parentChainInfo.blockExplorer,
      parentChainInfo.chainId,
      parentChainInfo.name
    )
    await checkAddresses(
      childAddressesToCheck,
      chain.rpcUrl,
      chain.explorerUrl,
      chain.chainId,
      chain.name
    )
  })

export type OrbitChainsList = {
  mainnet: OrbitChain[]
  testnet: OrbitChain[]
}

// Update the orbitChainsListSchema
export const orbitChainsListSchema = z.object({
  mainnet: z.array(chainSchema),
  testnet: z.array(chainSchema)
})

// Schema for incoming data from GitHub issue
export const incomingChainDataSchema = z.object({
  chainId: z.string().regex(/^\d+$/),
  name: z.string().min(1),
  description: descriptionSchema,
  chainLogo: urlSchema,
  color: colorHexSchema,
  rpcUrl: z.string().url(),
  explorerUrl: z.string().url(),
  parentChainId: z.string().regex(/^\d+$/),
  nativeTokenAddress: addressSchema.optional(),
  nativeTokenName: z.string().optional(),
  nativeTokenSymbol: z.string().optional(),
  nativeTokenLogo: urlSchema.optional(),
  rollup: addressSchema,
  parentGatewayRouter: addressSchema,
  childGatewayRouter: addressSchema,
  parentErc20Gateway: addressSchema,
  childErc20Gateway: addressSchema,
  parentCustomGateway: addressSchema,
  childCustomGateway: addressSchema,
  parentWethGateway: addressSchema,
  childWethGateway: addressSchema,
  parentWeth: addressSchema,
  childWeth: addressSchema,
  parentMultiCall: addressSchema,
  childMultiCall: addressSchema,
  fastWithdrawalActive: z.boolean(),
  fastWithdrawalMinutes: z.string().regex(/^\d+$/).optional()
})

// Schema for the final OrbitChain structure
export const orbitChainSchema = chainSchema

export const validateIncomingChainData = async (
  rawData: unknown
): Promise<IncomingChainData> => {
  try {
    return await incomingChainDataSchema.parseAsync(rawData)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation errors:')
      error.errors.forEach(err => {
        console.error(`${err.path.join('.')}: ${err.message}`)
      })
    }
    throw error
  }
}

export const validateOrbitChain = async (chainData: unknown) => {
  return await chainSchema.parseAsync(chainData)
}

export const chainDataLabelToKey: Record<string, string> = {
  'Chain ID': 'chainId',
  'Chain name': 'name',
  'Chain description': 'description',
  'Chain logo': 'chainLogo',
  'Brand color': 'color',
  'RPC URL': 'rpcUrl',
  'Explorer URL': 'explorerUrl',
  'Parent chain ID': 'parentChainId',
  'Native token address on Parent Chain': 'nativeTokenAddress',
  'Native token name': 'nativeTokenName',
  'Native token symbol': 'nativeTokenSymbol',
  'Native token logo': 'nativeTokenLogo',
  rollup: 'rollup',
  'Parent Gateway Router': 'parentGatewayRouter',
  'Child Gateway Router': 'childGatewayRouter',
  'Parent ERC20 Gateway': 'parentErc20Gateway',
  'Child ERC20 Gateway': 'childErc20Gateway',
  'Parent Custom Gateway': 'parentCustomGateway',
  'Child Custom Gateway': 'childCustomGateway',
  'Parent WETH Gateway': 'parentWethGateway',
  'Child WETH Gateway': 'childWethGateway',
  'Child WETH': 'childWeth',
  'Parent MultiCall': 'parentMultiCall',
  'Child MultiCall': 'childMultiCall',
  'Parent WETH': 'parentWeth',
  'Fast Withdrawals active': 'fastWithdrawalActive',
  'Fast Withdrawals time in minutes': 'fastWithdrawalMinutes'
}

export interface Issue {
  state: string
  body: string
  html_url: string
}

export type IncomingChainData = z.infer<typeof incomingChainDataSchema>
export type TokenBridgeAddresses = z.infer<typeof tokenBridgeSchema>
export type OrbitChain = z.infer<typeof chainSchema>

export interface FieldMetadata {
  label: string
  required: boolean
  type: 'string' | 'number' | 'address' | 'url' | 'color'
  validator?: (value: string) => boolean | string | number
}

export type GithubClient = ReturnType<typeof getOctokit>
