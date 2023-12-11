import { readContract } from '@wagmi/core'
import { CCTPSupportedChainId } from '../../state/cctpState'
import { FiatTokenProxyAbi } from '../../util/cctp/FiatTokenProxyAbi'
import { TokenMinterAbi } from '../../util/cctp/TokenMinterAbi'
import { getContracts } from '@/token-bridge-sdk/cctp'

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
    abi: FiatTokenProxyAbi,
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
    abi: TokenMinterAbi,
    functionName: 'burnLimitsPerMessage',
    args: [usdcContractAddress]
  })
}
