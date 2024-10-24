import { EthBridger, getArbitrumNetwork } from '@arbitrum/sdk'
import { BigNumber, constants } from 'ethers'

import { DepositGasEstimates } from '../hooks/arbTokenBridge.types'
import { fetchErc20Allowance } from './TokenUtils'
import { DepositTxEstimateGasParams } from './TokenDepositUtils'
import { isCustomDestinationAddressTx } from '../state/app/utils'

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

  const customFeeToken = typeof ethBridger.nativeToken !== 'undefined'

  if (customFeeToken && (await customFeeTokenAllowanceIsInsufficient(params))) {
    return fetchFallbackGasEstimatesForOrbitChainWithCustomFeeToken()
  }

  const isDifferentDestinationAddress = isCustomDestinationAddressTx({
    sender: address,
    destination: destinationAddress
  })

  if (isDifferentDestinationAddress) {
    try {
      const depositToRequest = await ethBridger.getDepositToRequest({
        amount,
        from: address,
        parentProvider: parentChainProvider,
        childProvider: childChainProvider,
        // we know it's defined
        destinationAddress: String(destinationAddress)
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
