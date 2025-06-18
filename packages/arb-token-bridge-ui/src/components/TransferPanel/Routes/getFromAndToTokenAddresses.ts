import { ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types'
import { getLifiDestinationToken } from '../../../pages/api/crosschain-transfers/utils'
import { constants } from 'ethers'

/**
 * get source and destination token for lifi route
 */
export function getFromAndToTokenAddresses({
  isDepositMode,
  selectedToken,
  sourceChainId,
  destinationChainId
}: {
  isDepositMode: boolean
  selectedToken: Pick<ERC20BridgeToken, 'address' | 'l2Address'> | null
  sourceChainId: number
  destinationChainId: number
}) {
  const fromToken =
    (isDepositMode ? selectedToken?.address : selectedToken?.l2Address) ||
    constants.AddressZero

  return {
    fromToken,
    toToken: getLifiDestinationToken({
      fromToken,
      fromChainId: sourceChainId,
      toChainId: destinationChainId
    })
  }
}
