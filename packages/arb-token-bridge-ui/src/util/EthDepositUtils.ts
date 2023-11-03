import { EthBridger, getChain } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber, constants } from 'ethers'

import { DepositGasEstimates } from '../hooks/arbTokenBridge.types'
import { fetchErc20Allowance } from './TokenUtils'

async function fetchFallbackGasEstimatesForOrbitChainWithCustomFeeToken(): Promise<DepositGasEstimates> {
  return {
    // todo(spsjvc): properly estimate these values
    //
    // this hardcoding is only necessary for Orbit chains that have a custom fee token (where estimation may fail due to low allowance)
    estimatedL1Gas: BigNumber.from(100_000),
    estimatedL2Gas: BigNumber.from(0),
    estimatedL2SubmissionCost: BigNumber.from(0)
  }
}

async function customFeeTokenAllowanceIsInsufficient(
  params: DepositEthEstimateGasParams
) {
  const { amount, address, l1Provider, l2Provider } = params
  const l2Network = await getChain(l2Provider)

  if (typeof l2Network.nativeToken === 'undefined') {
    throw new Error(
      '[customFeeTokenAllowanceIsInsufficient] expected nativeToken to be defined'
    )
  }

  const customFeeTokenAllowanceForInbox = await fetchErc20Allowance({
    address: l2Network.nativeToken,
    provider: l1Provider,
    owner: address,
    spender: l2Network.ethBridge.inbox
  })

  return customFeeTokenAllowanceForInbox.lt(amount)
}

export type DepositEthEstimateGasParams = {
  amount: BigNumber
  address: string
  l1Provider: Provider
  l2Provider: Provider
}

export async function depositEthEstimateGas(
  params: DepositEthEstimateGasParams
): Promise<DepositGasEstimates> {
  const { amount, address, l1Provider, l2Provider } = params

  const ethBridger = await EthBridger.fromProvider(l2Provider)
  const customFeeToken = typeof ethBridger.nativeToken !== 'undefined'

  if (customFeeToken && (await customFeeTokenAllowanceIsInsufficient(params))) {
    return fetchFallbackGasEstimatesForOrbitChainWithCustomFeeToken()
  }

  // todo: update this when we support custom destination addresses for eth deposits
  const depositRequest = await ethBridger.getDepositRequest({
    amount,
    from: address
  })

  const estimatedL1Gas = await l1Provider.estimateGas(depositRequest.txRequest)

  return {
    estimatedL1Gas,
    estimatedL2Gas: constants.Zero,
    estimatedL2SubmissionCost: constants.Zero
  }
}
