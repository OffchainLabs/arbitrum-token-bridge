import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { MaxUint256 } from '@ethersproject/constants'
import { Provider } from '@ethersproject/providers'
import { fetchErc20ParentChainGatewayAddress } from './TokenUtils'

export const approveTokenEstimateGas = async ({
  erc20L1Address,
  address,
  l1Provider,
  l2Provider
}: {
  erc20L1Address: string
  address: string
  l1Provider: Provider
  l2Provider: Provider
}) => {
  const l1GatewayAddress = await fetchErc20ParentChainGatewayAddress({
    erc20ParentChainAddress: erc20L1Address,
    parentChainProvider: l1Provider,
    childChainProvider: l2Provider
  })

  const contract = ERC20__factory.connect(erc20L1Address, l1Provider)

  return contract.estimateGas.approve(l1GatewayAddress, MaxUint256, {
    from: address
  })
}
