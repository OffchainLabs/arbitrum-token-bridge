import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { MaxUint256 } from '@ethersproject/constants'
import { Provider } from '@ethersproject/providers'
import { BigNumber, constants, Signer } from 'ethers'
import { getContracts } from '@/token-bridge-sdk/cctp'
import { CCTPSupportedChainId } from '../state/cctpState'
import { fetchErc20L1GatewayAddress } from './TokenUtils'

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
  const l1GatewayAddress = await fetchErc20L1GatewayAddress({
    erc20L1Address,
    l1Provider,
    l2Provider
  })

  const contract = ERC20__factory.connect(erc20L1Address, l1Provider)

  return contract.estimateGas.approve(l1GatewayAddress, MaxUint256, {
    from: address
  })
}

export async function approveCctpEstimateGas(
  sourceChainId: CCTPSupportedChainId,
  amount: BigNumber,
  signer: Signer
) {
  const { usdcContractAddress, tokenMessengerContractAddress } =
    getContracts(sourceChainId)
  const contract = ERC20__factory.connect(usdcContractAddress, signer)

  try {
    return await contract.estimateGas.approve(
      tokenMessengerContractAddress,
      amount
    )
  } catch (e) {
    return constants.Zero
  }
}
