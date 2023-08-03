import { readContract } from '@wagmi/core'
import { fiatTokenProxyAbi } from '../../util/cctp/fiatTokenProxyAbi'
import { tokenMinterAbi } from '../../util/cctp/tokenMinterAbi'
import { getContracts, CCTPSupportedChainId } from './useCCTP'

/**
 *
 * @param targetChainId target ChainId of the CCTP transfer
 *
 * See https://developers.circle.com/stablecoin/docs/cctp-technical-reference#transaction-limits
 *
 * Note: fetchMinterAllowance returns allowance on the DESTINATION chain
 */
export function fetchMinterAllowance({
  targetChainId
}: {
  targetChainId: CCTPSupportedChainId
}) {
  const { usdcContractAddress, tokenMinterContractAddress } =
    getContracts(targetChainId)

  return readContract({
    address: usdcContractAddress,
    chainId: targetChainId,
    abi: fiatTokenProxyAbi,
    functionName: 'minterAllowance',
    args: [tokenMinterContractAddress]
  })
}

export function fetchPerMessageBurnLimit({
  sourceChainId
}: {
  sourceChainId: CCTPSupportedChainId
}) {
  const { usdcContractAddress, tokenMinterContractAddress } =
    getContracts(sourceChainId)

  return readContract({
    address: tokenMinterContractAddress,
    chainId: sourceChainId,
    abi: tokenMinterAbi,
    functionName: 'burnLimitsPerMessage',
    args: [usdcContractAddress]
  })
}
