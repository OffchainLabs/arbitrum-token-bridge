import { BigNumber, utils } from 'ethers'

export function calculateEstimatedParentChainGasFees(
  estimatedParentChainGas: BigNumber,
  parentChainGasPrice: BigNumber
) {
  return parseFloat(
    utils.formatEther(estimatedParentChainGas.mul(parentChainGasPrice))
  )
}
