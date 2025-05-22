import { EthBridger, getArbitrumNetwork } from '@arbitrum/sdk'
import { BigNumber, constants } from 'ethers'

import { DepositGasEstimates } from '../hooks/arbTokenBridge.types'
import { fetchErc20Allowance } from './TokenUtils'
import { DepositTxEstimateGasParams } from './TokenDepositUtils'
import { isCustomDestinationAddressTx } from '../state/app/utils'

function fetchFallbackGasEstimatesForOrbitChainWithCustomFeeToken({
  isCustomDestinationAddressTx
}: {
  isCustomDestinationAddressTx: boolean
}): DepositGasEstimates {
  // todo(spsjvc): properly estimate these values
  //
  // this hardcoding is only necessary for Orbit chains that have a custom fee token (where estimation may fail due to low allowance)
  if (!isCustomDestinationAddressTx) {
    return {
      estimatedParentChainGas: BigNumber.from(100_000),
      estimatedChildChainGas: constants.Zero,
      estimatedChildChainSubmissionCost: constants.Zero
    }
  }

  // custom destination transfer using retryables
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

  const isDifferentDestinationAddress = isCustomDestinationAddressTx({
    sender: address,
    destination: destinationAddress
  })

  if (customFeeToken && (await customFeeTokenAllowanceIsInsufficient(params))) {
    return fetchFallbackGasEstimatesForOrbitChainWithCustomFeeToken({
      isCustomDestinationAddressTx: isDifferentDestinationAddress
    })
  }

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // we use retryables so we may not be able to fetch gas if the current approval doesn't cover gas costs
      return fetchFallbackGasEstimatesForOrbitChainWithCustomFeeToken({
        isCustomDestinationAddressTx: isDifferentDestinationAddress
      })
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
