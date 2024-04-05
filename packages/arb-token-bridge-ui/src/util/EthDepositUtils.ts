import { EthBridger, getL2Network } from '@arbitrum/sdk'
import { BigNumber, constants } from 'ethers'

import { DepositGasEstimates } from '../hooks/arbTokenBridge.types'
import { fetchErc20Allowance } from './TokenUtils'
import { DepositTxEstimateGasParams } from './TokenDepositUtils'

function fetchFallbackGasEstimatesForOrbitChainWithCustomFeeToken(): DepositGasEstimates {
  return {
    // todo(spsjvc): properly estimate these values
    //
    // this hardcoding is only necessary for Orbit chains that have a custom fee token (where estimation may fail due to low allowance)
    estimatedParentChainGas: BigNumber.from(100_000),
    estimatedChildChainGas: constants.Zero,
    estimatedChildChainSubmissionCost: constants.Zero
  }
}

async function customFeeTokenAllowanceIsInsufficient(
  params: DepositEthEstimateGasParams
) {
  const { amount, address, parentChainProvider, childChainProvider } = params
  const l2Network = await getL2Network(childChainProvider)

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
  const { amount, address, parentChainProvider, childChainProvider } = params
  const ethBridger = await EthBridger.fromProvider(childChainProvider)

  const customFeeToken = typeof ethBridger.nativeToken !== 'undefined'

  if (customFeeToken && (await customFeeTokenAllowanceIsInsufficient(params))) {
    return fetchFallbackGasEstimatesForOrbitChainWithCustomFeeToken()
  }

  // todo: update this when we support custom destination addresses for eth deposits
  const depositRequest = await ethBridger.getDepositRequest({
    amount,
    from: address
  })

  const estimatedParentChainGas = await parentChainProvider.estimateGas(
    depositRequest.txRequest
  )

  return {
    estimatedParentChainGas,
    estimatedChildChainGas: constants.Zero,
    estimatedChildChainSubmissionCost: constants.Zero
  }
}
