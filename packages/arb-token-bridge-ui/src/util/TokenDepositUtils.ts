import { Erc20Bridger } from '@arbitrum/sdk'
import { Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Inbox__factory'
import { Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'

import { DepositGasEstimates } from '../hooks/arbTokenBridge.types'
import { fetchErc20Allowance, fetchErc20L1GatewayAddress } from './TokenUtils'

async function fetchFallbackGasEstimates({
  inboxAddress,
  l1Provider
}: {
  inboxAddress: string
  l1Provider: Provider
}): Promise<DepositGasEstimates> {
  const l1BaseFee = await l1Provider.getGasPrice()
  const inbox = Inbox__factory.connect(inboxAddress, l1Provider)

  const estimatedL2SubmissionCost = await inbox.calculateRetryableSubmissionFee(
    // Values set by looking at a couple of L1 gateways
    //
    // L1 LPT Gateway: 324
    // L1 DAI Gateway: 324
    // L1 Standard Gateway (APE): 740
    // L1 Custom Gateway (USDT): 324
    // L1 WETH Gateway: 324
    BigNumber.from(1_000),
    // We do the same percent increase in the SDK
    //
    // https://github.com/OffchainLabs/arbitrum-sdk/blob/main/src/lib/message/L1ToL2MessageGasEstimator.ts#L132
    l1BaseFee.add(l1BaseFee.mul(BigNumber.from(3)))
  )

  return {
    // Values set by looking at a couple of different ERC-20 deposits
    //
    // https://etherscan.io/tx/0x5c0ab94413217d54641ba5faa0c614c6dd5f97efcc7a6ca25df9c376738dfa34
    // https://etherscan.io/tx/0x0049a5a171b891c5826ba47e77871fa6bae6eb57fcaf474a97d62ab07a815a2c
    // https://etherscan.io/tx/0xb11bffdfbe4bc6fb4328c390d4cdf73bc863dbaaef057afb59cd83dfd6dc210c
    // https://etherscan.io/tx/0x194ab69d3d2b5730b37e8bad1473f8bc54ded7a2ad3708d131ef13c09168d67e
    // https://etherscan.io/tx/0xc4789d3f13e0efb011dfa88eef89b4b715d8c32366977eae2d3b85f13b3aa6c5
    estimatedL1Gas: BigNumber.from(240_000),
    // Values set by looking at a couple of different ERC-20 deposits
    //
    // https://arbiscan.io/tx/0x483206b0ed4e8a23b14de070f6c552120d0b9bc6ed028f4feae33c4ca832f2bc
    // https://arbiscan.io/tx/0xd2ba11ebc51f546abc2ddda715507948d097e5707fd1dc37c239cc4cf28cc6ed
    // https://arbiscan.io/tx/0xb341745b6f4a34ee539c628dcf177fc98b658e494c7f8d21da872e69d5173596
    // https://arbiscan.io/tx/0x731d31834bc01d33a1de33b5562b29c1ae6f75d20f6da83a5d74c3c91bd2dab9
    // https://arbiscan.io/tx/0x6b13bfe9f22640ac25f77a677a3c36e748913d5e07766b3d6394de09a1398020
    estimatedL2Gas: BigNumber.from(100_000),
    estimatedL2SubmissionCost
  }
}

async function allowanceIsInsufficient(params: DepositTokenEstimateGasParams) {
  const { amount, address, erc20L1Address, l1Provider, l2Provider } = params

  const l1Gateway = await fetchErc20L1GatewayAddress({
    erc20L1Address,
    l1Provider,
    l2Provider
  })

  const allowanceForL1Gateway = await fetchErc20Allowance({
    address: erc20L1Address,
    provider: l1Provider,
    owner: address,
    spender: l1Gateway
  })

  return allowanceForL1Gateway.lt(amount)
}

export type DepositTokenEstimateGasParams = {
  amount: BigNumber
  address: string
  erc20L1Address: string
  l1Provider: Provider
  l2Provider: Provider
}

export async function depositTokenEstimateGas(
  params: DepositTokenEstimateGasParams
): Promise<DepositGasEstimates> {
  const { amount, address, erc20L1Address, l1Provider, l2Provider } = params
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)

  if (await allowanceIsInsufficient(params)) {
    console.warn(
      `Gateway allowance for "${erc20L1Address}" is too low, falling back to hardcoded values.`
    )

    return fetchFallbackGasEstimates({
      inboxAddress: erc20Bridger.l2Network.ethBridge.inbox,
      l1Provider
    })
  }

  const { txRequest, retryableData } = await erc20Bridger.getDepositRequest({
    amount,
    erc20L1Address,
    l1Provider,
    l2Provider,
    from: address,
    retryableGasOverrides: {
      // temp hardcoded value for v2.2.4
      gasLimit: { base: BigNumber.from(300_000) }
    }
  })

  return {
    estimatedL1Gas: await l1Provider.estimateGas(txRequest),
    estimatedL2Gas: retryableData.gasLimit,
    estimatedL2SubmissionCost: retryableData.maxSubmissionCost
  }
}
