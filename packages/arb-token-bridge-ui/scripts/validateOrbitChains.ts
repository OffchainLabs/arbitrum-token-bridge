import z from 'zod'
import { isAddress } from 'ethers/lib/utils.js'

import { getOrbitChains, OrbitChainConfig } from '../src/util/orbit'

const zAddress = z
  .string()
  .refine(address => isAddress(address), 'Invalid address')

const zIsTrue = z
  .boolean()
  .refine(bool => bool === true, 'Invalid input, must be true')

function validateOrbitChain(chain: OrbitChainConfig) {
  try {
    z.object({
      chainId: z.number().nonnegative().int(),
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
      isCustom: zIsTrue,
      name: z.string(),
      slug: z.string(),
      parentChainId: z.number().nonnegative().int(),
      retryableLifetimeSeconds: z.number().nonnegative().int(),
      tokenBridge: z.object({
        parentCustomGateway: zAddress,
        parentErc20Gateway: zAddress,
        parentGatewayRouter: zAddress,
        parentMultiCall: zAddress,
        parentProxyAdmin: zAddress,
        parentWeth: zAddress,
        parentWethGateway: zAddress,
        childCustomGateway: zAddress,
        childErc20Gateway: zAddress,
        childGatewayRouter: zAddress,
        childMultiCall: zAddress,
        childProxyAdmin: zAddress,
        childWeth: zAddress,
        childWethGateway: zAddress
      }),
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
      `Error while validating Orbit chain: ${chain.name} (${chain.chainId}):`
    )
    throw e
  }
}

function main() {
  getOrbitChains().forEach(validateOrbitChain)
}

main()
