import { EthBridger, getArbitrumNetwork } from '@arbitrum/sdk'
import { BigNumber, constants } from 'ethers'

import { DepositGasEstimates } from '../hooks/arbTokenBridge.types'
import { fetchErc20Allowance } from './TokenUtils'
import { DepositTxEstimateGasParams } from './TokenDepositUtils'

function fetchFallbackGasEstimatesForOrbitChainWithCustomFeeToken(): DepositGasEstimates {
  // todo(spsjvc): properly estimate these values
  // native currency transfers using retryables
  return {
    estimatedParentChainGas: BigNumber.from(100_000),
    // hardcoded gas limit on child chain based on
    // https://testnet-explorer-v2.xai-chain.net/tx/0xe120590ea8612105c1487a0c3cd470b43411bbdda5bbbadd4428c07f5f22d890
    // https://sepolia.arbiscan.io/tx/0x94a4d64cf21a9cca8fc9f6c049a45a0589c1ff5796e90e7ebbae1b7cd82ecb11
    estimatedChildChainGas: BigNumber.from(30_000),
    estimatedChildChainSubmissionCost: constants.Zero
  }
}

async function customFeeTokenAllowanceIsInsufficient(
  params: DepositEthEstimateGasParams
) {
  const { amount, address, parentChainProvider, childChainProvider } = params
  const l2Network = await getArbitrumNetwork(childChainProvider)

  if (typeof l2Network.nativeToken === 'undefined') {
    throw new Error(
      '[customFeeTokenAllowanceIsInsufficient] expected nativeToken to be defined'
    )
  }

  const customFeeTokenAllowanceForInbox = await fetchErc20Allowance({
    address: l2Network.nativeToken,
    provider: parentChainProvider,
    owner: address,
    spender: l2Network.ethBridge.inbox
  })

  return customFeeTokenAllowanceForInbox.lt(amount)
}

export type DepositEthEstimateGasParams = Omit<
  DepositTxEstimateGasParams,
  'erc20L1Address'
>

export async function depositEthEstimateGas(
  params: DepositEthEstimateGasParams
): Promise<DepositGasEstimates> {
  const {
    amount,
    address,
    parentChainProvider,
    childChainProvider,
    destinationAddress
  } = params
  const ethBridger = await EthBridger.fromProvider(childChainProvider)

  const customFeeToken =
    typeof ethBridger.nativeToken !== 'undefined' &&
    ethBridger.nativeToken !== constants.AddressZero

  if (customFeeToken && (await customFeeTokenAllowanceIsInsufficient(params))) {
    return fetchFallbackGasEstimatesForOrbitChainWithCustomFeeToken()
  }

  try {
    const depositToRequest = await ethBridger.getDepositToRequest({
      amount,
      from: address,
      parentProvider: parentChainProvider,
      childProvider: childChainProvider,
      destinationAddress: destinationAddress ?? address
    })

    const estimatedParentChainGas = await parentChainProvider.estimateGas(
      depositToRequest.txRequest
    )

    return {
      estimatedParentChainGas,
      estimatedChildChainGas: depositToRequest.retryableData.gasLimit,
      estimatedChildChainSubmissionCost:
        depositToRequest.retryableData.maxSubmissionCost
    }
  } catch (_) {
    // we use retryables so we may not be able to fetch gas if the current approval doesn't cover gas costs
    return fetchFallbackGasEstimatesForOrbitChainWithCustomFeeToken()
  }
}
