import { Erc20Bridger, getArbitrumNetwork } from '@arbitrum/sdk'
import { Inbox__factory } from '@arbitrum/sdk/dist/lib/abi/factories/Inbox__factory'
import { Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'

import {
  fetchErc20Allowance,
  fetchErc20ParentChainGatewayAddress,
  getL2ERC20Address
} from './TokenUtils'
import { AssetType, DepositGasEstimates } from '../hooks/arbTokenBridge.types'
import { addressIsSmartContract } from './AddressUtils'
import { getChainIdFromProvider } from '../token-bridge-sdk/utils'
import { captureSentryErrorWithExtraData } from './SentryUtils'
import { MergedTransaction } from '../state/app/state'
import { isExperimentalFeatureEnabled } from '.'

async function fetchTokenFallbackGasEstimates({
  inboxAddress,
  parentChainErc20Address,
  parentChainProvider,
  childChainProvider
}: {
  inboxAddress: string
  parentChainErc20Address: string
  parentChainProvider: Provider
  childChainProvider: Provider
}): Promise<DepositGasEstimates> {
  const l1BaseFee = await parentChainProvider.getGasPrice()
  const inbox = Inbox__factory.connect(inboxAddress, parentChainProvider)

  const estimatedChildChainSubmissionCost =
    await inbox.calculateRetryableSubmissionFee(
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

  // Values set by looking at a couple of different ERC-20 deposits
  // https://etherscan.io/tx/0x5c0ab94413217d54641ba5faa0c614c6dd5f97efcc7a6ca25df9c376738dfa34
  // https://etherscan.io/tx/0x0049a5a171b891c5826ba47e77871fa6bae6eb57fcaf474a97d62ab07a815a2c
  // https://etherscan.io/tx/0xb11bffdfbe4bc6fb4328c390d4cdf73bc863dbaaef057afb59cd83dfd6dc210c
  // https://etherscan.io/tx/0x194ab69d3d2b5730b37e8bad1473f8bc54ded7a2ad3708d131ef13c09168d67e
  // https://etherscan.io/tx/0xc4789d3f13e0efb011dfa88eef89b4b715d8c32366977eae2d3b85f13b3aa6c5
  const estimatedParentChainGas = BigNumber.from(240_000)

  const childChainTokenAddress = await getL2ERC20Address({
    erc20L1Address: parentChainErc20Address,
    l1Provider: parentChainProvider,
    l2Provider: childChainProvider
  })

  const childChainId = await getChainIdFromProvider(childChainProvider)

  const isFirstTimeTokenBridging = !(await addressIsSmartContract(
    childChainTokenAddress,
    childChainId
  ))
  if (isFirstTimeTokenBridging) {
    return {
      estimatedParentChainGas,
      // Values set by looking at a couple of different ERC-20 deposits, with added buffer to account for the 30% gas limit increase (see `depositTokenEstimateGas`)
      // https://explorer.xai-chain.net/tx/0x9b069c244e6c1ebb3eebfe9f653eb4c9fcb171ab56c68770509c86c16bb078a0
      // https://explorer.xai-chain.net/tx/0x68203e316c690878e35a8aa77db32108cd9afcc02eb7488ce3d2869a87e84492
      estimatedChildChainGas: BigNumber.from(800_000),
      estimatedChildChainSubmissionCost
    }
  }

  // custom gateway token deposits have a higher gas limit in the @arbitrum/sdk : https://github.com/OffchainLabs/arbitrum-sdk/blob/main/src/lib/assetBridger/erc20Bridger.ts#L181
  // tx example: https://arbiscan.io/tx/0x8f52daffdd97af8130d667a74a89234cd9ce838d23214d61818bd9743a2f64f8 // 275_000
  const isCustomGatewayTokenDeposit = await addressIsCustomGatewayToken({
    parentChainErc20Address,
    parentChainProvider,
    childChainProvider
  })
  if (isCustomGatewayTokenDeposit) {
    return {
      estimatedParentChainGas,
      estimatedChildChainGas: BigNumber.from(300_000),
      estimatedChildChainSubmissionCost
    }
  }

  return {
    estimatedParentChainGas,
    // Values set by looking at a couple of different ERC-20 deposits, with added buffer to account for the 30% gas limit increase (see `depositTokenEstimateGas`)
    // https://arbiscan.io/tx/0x483206b0ed4e8a23b14de070f6c552120d0b9bc6ed028f4feae33c4ca832f2bc
    // https://arbiscan.io/tx/0xd2ba11ebc51f546abc2ddda715507948d097e5707fd1dc37c239cc4cf28cc6ed
    // https://arbiscan.io/tx/0xb341745b6f4a34ee539c628dcf177fc98b658e494c7f8d21da872e69d5173596
    // https://arbiscan.io/tx/0x731d31834bc01d33a1de33b5562b29c1ae6f75d20f6da83a5d74c3c91bd2dab9
    // https://arbiscan.io/tx/0x6b13bfe9f22640ac25f77a677a3c36e748913d5e07766b3d6394de09a1398020
    estimatedChildChainGas: BigNumber.from(150_000),
    estimatedChildChainSubmissionCost
  }
}

async function allowanceIsInsufficient(params: DepositTokenEstimateGasParams) {
  const {
    amount,
    address,
    parentChainErc20Address,
    parentChainProvider,
    childChainProvider
  } = params

  const l1Gateway = await fetchErc20ParentChainGatewayAddress({
    erc20ParentChainAddress: parentChainErc20Address,
    parentChainProvider,
    childChainProvider
  })

  const allowanceForL1Gateway = await fetchErc20Allowance({
    address: parentChainErc20Address,
    provider: parentChainProvider,
    owner: address,
    spender: l1Gateway
  })

  return allowanceForL1Gateway.lt(amount)
}

export type DepositTxEstimateGasParams = {
  amount: BigNumber
  address: string
  parentChainErc20Address?: string
  parentChainProvider: Provider
  childChainProvider: Provider
}

type DepositTokenEstimateGasParams = Required<DepositTxEstimateGasParams>

export async function depositTokenEstimateGas(
  params: DepositTokenEstimateGasParams
): Promise<DepositGasEstimates> {
  const {
    amount,
    address,
    parentChainErc20Address,
    parentChainProvider,
    childChainProvider
  } = params
  const erc20Bridger = await Erc20Bridger.fromProvider(childChainProvider)

  try {
    if (await allowanceIsInsufficient(params)) {
      console.warn(
        `Gateway allowance for "${parentChainErc20Address}" is too low, falling back to hardcoded values.`
      )

      return fetchTokenFallbackGasEstimates({
        inboxAddress: erc20Bridger.childNetwork.ethBridge.inbox,
        parentChainErc20Address,
        parentChainProvider,
        childChainProvider
      })
    }

    const { txRequest, retryableData } = await erc20Bridger.getDepositRequest({
      amount,
      erc20ParentAddress: parentChainErc20Address,
      parentProvider: parentChainProvider,
      childProvider: childChainProvider,
      from: address,
      retryableGasOverrides: {
        // the gas limit may vary by about 20k due to SSTORE (zero vs nonzero)
        // the 30% gas limit increase should cover the difference
        gasLimit: { percentIncrease: BigNumber.from(30) }
      }
    })

    return {
      estimatedParentChainGas: await parentChainProvider.estimateGas(txRequest),
      estimatedChildChainGas: retryableData.gasLimit,
      estimatedChildChainSubmissionCost: retryableData.maxSubmissionCost
    }
  } catch (error) {
    captureSentryErrorWithExtraData({
      error,
      originFunction: 'depositTokenEstimateGas'
    })

    return fetchTokenFallbackGasEstimates({
      inboxAddress: erc20Bridger.childNetwork.ethBridge.inbox,
      parentChainErc20Address,
      parentChainProvider,
      childChainProvider
    })
  }
}

async function addressIsCustomGatewayToken({
  parentChainErc20Address,
  parentChainProvider,
  childChainProvider
}: {
  parentChainErc20Address: string
  parentChainProvider: Provider
  childChainProvider: Provider
}) {
  const parentChainGatewayAddress = await fetchErc20ParentChainGatewayAddress({
    erc20ParentChainAddress: parentChainErc20Address,
    parentChainProvider,
    childChainProvider
  })
  const childChainNetwork = await getArbitrumNetwork(childChainProvider)
  return (
    parentChainGatewayAddress.toLowerCase() ===
    childChainNetwork.tokenBridge?.parentCustomGateway.toLowerCase()
  )
}

export function isBatchTransfer(tx: MergedTransaction) {
  return (
    isExperimentalFeatureEnabled('batch') &&
    !tx.isCctp &&
    !tx.isWithdrawal &&
    tx.assetType === AssetType.ERC20 &&
    typeof tx.value2 !== 'undefined' &&
    Number(tx.value2) > 0
  )
}
