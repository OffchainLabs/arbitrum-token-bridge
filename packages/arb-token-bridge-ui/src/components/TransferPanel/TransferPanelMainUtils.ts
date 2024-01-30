import { BigNumber, utils } from 'ethers'

export function calculateEstimatedParentChainGasFees(
  estimatedParentChainGas: BigNumber,
  parentChainGasPrice: BigNumber
) {
  return parseFloat(
    utils.formatEther(estimatedParentChainGas.mul(parentChainGasPrice))
  )
}

export function calculateEstimatedChildChainGasFees(
  estimatedChildChainGas: BigNumber,
  childChainGasPrice: BigNumber,
  estimatedChildChainSubmissionCost: BigNumber
) {
  return parseFloat(
    utils.formatEther(
      estimatedChildChainGas
        .mul(childChainGasPrice)
        .add(estimatedChildChainSubmissionCost)
    )
  )
}
