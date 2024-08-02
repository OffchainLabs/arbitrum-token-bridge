import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { fetchErc20L2GatewayAddress } from './TokenUtils'
import { ChainId } from './networks'

export const xErc20Gateways: {
  [chainId: number]: {
    parentChainId: ChainId
    parentGateway: string
    childGateway: string
  }
} = {
  [ChainId.ArbitrumSepolia]: {
    parentChainId: ChainId.Sepolia,
    parentGateway: '0x30BEc9c7C2d102aF63F23712bEAc69cdF013f062',
    childGateway: '0x30BEc9c7C2d102aF63F23712bEAc69cdF013f062'
  }
}

export async function xErc20RequiresApprovalOnChildChain(
  tokenAddress: string,
  parentChainId: ChainId,
  childChainId: ChainId
): Promise<boolean> {
  const gatewayData = xErc20Gateways[childChainId]

  if (gatewayData?.parentChainId !== parentChainId) {
    return false
  }

  const childChainProvider = getProviderForChainId(childChainId)

  const childChainGatewayAddress = await fetchErc20L2GatewayAddress({
    erc20L1Address: tokenAddress,
    l2Provider: childChainProvider
  })

  if (
    childChainGatewayAddress.toLowerCase() ===
    gatewayData.childGateway.toLowerCase()
  ) {
    return true
  }

  return false
}
