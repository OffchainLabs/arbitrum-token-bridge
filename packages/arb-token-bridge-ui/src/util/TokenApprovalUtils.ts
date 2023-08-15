import { Erc20Bridger } from '@arbitrum/sdk'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import { MaxUint256 } from '@ethersproject/constants'
import { Provider } from '@ethersproject/providers'
import { BigNumber, constants, Signer } from 'ethers'
import { getContracts } from '../hooks/CCTP/useCCTP'
import { CCTPSupportedChainId } from '../state/cctpState'

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
  const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)

  const l1GatewayAddress = await erc20Bridger.getL1GatewayAddress(
    erc20L1Address,
    l1Provider
  )

  const contract = ERC20__factory.connect(erc20L1Address, l1Provider)

  return contract.estimateGas.approve(l1GatewayAddress, MaxUint256, {
    from: address
  })
}

export async function approveCctpEstimateGas(
  chainId: CCTPSupportedChainId,
  amount: BigNumber,
  signer: Signer
) {
  const { usdcContractAddress, tokenMessengerContractAddress } =
    getContracts(chainId)
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
