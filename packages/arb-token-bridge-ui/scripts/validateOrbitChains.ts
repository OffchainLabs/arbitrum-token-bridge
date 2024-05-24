import z from 'zod'
import { isAddress } from 'ethers/lib/utils.js'

import { getOrbitChains, OrbitChainConfig } from '../src/util/orbit'
import { constants } from 'ethers'

const zAddress = z
  .string()
  .refine(address => isAddress(address), 'Invalid address')

const zIsTrue = z
  .boolean()
  .refine(bool => bool === true, 'Invalid input, must be true')

function validateOrbitChain(chain: OrbitChainConfig) {
  try {
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
      explorerUrl: z.string().url(),
      rpcUrl: z.string().url(),
      isArbitrum: zIsTrue,
      isCustom: zIsTrue,
      name: z.string(),
      slug: z.string(),
      partnerChainID: z.number().nonnegative().int(),
      partnerChainIDs: z.array(z.number()).refine(arr => arr.length === 0),
      retryableLifetimeSeconds: z.number().nonnegative().int(),
      blockTime: z.number().refine(num => num === 0.25),
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
      nitroGenesisBlock: z.number().refine(num => num === 0),
      nitroGenesisL1Block: z.number().refine(num => num === 0),
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
            logoUrl: z.string()
          })
          .optional()
      })
    }).parse(chain)
  } catch (e) {
    console.error(
      `Error while validating Orbit chain: ${chain.name} (${chain.chainID}):`
    )
    throw e
  }
}

function main() {
  getOrbitChains().forEach(validateOrbitChain)
}

main()
