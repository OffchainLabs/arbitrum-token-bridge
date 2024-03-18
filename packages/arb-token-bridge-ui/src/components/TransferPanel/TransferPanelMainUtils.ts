import { BigNumber, utils } from 'ethers'

export function calculateEstimatedL1GasFees(
  estimatedL1Gas: BigNumber,
  l1GasPrice: BigNumber
) {
  return parseFloat(utils.formatEther(estimatedL1Gas.mul(l1GasPrice)))
}

export function calculateEstimatedL2GasFees(
  estimatedL2Gas: BigNumber,
  l2GasPrice: BigNumber,
  estimatedL2SubmissionCost: BigNumber
) {
  return parseFloat(
    utils.formatEther(
      estimatedL2Gas.mul(l2GasPrice).add(estimatedL2SubmissionCost)
    )
  )
}
