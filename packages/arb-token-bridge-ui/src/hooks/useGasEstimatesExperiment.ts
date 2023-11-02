import { useEffect, useState } from 'react'
import {
  GasEstimatorProps,
  GasEstimates
} from '../__experiments__/GasEstimator'
import { BigNumber, constants } from 'ethers'
import { AssetType } from './arbTokenBridge.types'
import { isNetwork } from '../util/networks'
import { Erc20DepositGasEstimator } from '../__experiments__/Erc20DepositGasEstimator'
import { Erc20WithdrawalGasEstimator } from '../__experiments__/Erc20WithdrawalGasEstimator'

export const useGasEstimatesExperiment = ({
  sourceChainProvider,
  destinationChainProvider,
  sourceChainErc20ContractAddress,
  destinationChainErc20ContractAddress,
  amount
}: GasEstimatorProps) => {
  const [gasEstimates, setGasEstimates] = useState<GasEstimates>({
    sourceChain: {
      gasAmount: constants.Zero,
      gasAssetType: AssetType.ETH
    },
    destinationChain: {
      gasAmount: constants.Zero,
      gasAssetType: AssetType.ETH
    }
  })

  useEffect(() => {
    const getSetGasEstimates = async () => {
      const sourceChainId = (await sourceChainProvider.getNetwork()).chainId
      //   const destinationChainId = (await destinationChainProvider.getNetwork())
      //     .chainId

      const GasEstimatesClass = new (
        isNetwork(sourceChainId).isEthereum
          ? Erc20DepositGasEstimator
          : Erc20WithdrawalGasEstimator
      )({
        sourceChainProvider,
        destinationChainProvider,
        sourceChainErc20ContractAddress,
        destinationChainErc20ContractAddress,
        amount
      })

      setGasEstimates(await GasEstimatesClass.getGasEstimates())
    }

    getSetGasEstimates()
  }, [
    sourceChainProvider,
    destinationChainProvider,
    amount,
    sourceChainErc20ContractAddress,
    destinationChainErc20ContractAddress
  ])

  return { gasEstimates }
}
