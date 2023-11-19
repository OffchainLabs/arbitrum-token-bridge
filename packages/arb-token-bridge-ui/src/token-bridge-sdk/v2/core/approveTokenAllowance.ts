import { Erc20Bridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber, Signer } from 'ethers'
import { fetchErc20Allowance } from '../../../util/TokenUtils'
import { NativeCurrency } from '../../../hooks/useNativeCurrency'
import { fetchErc20L1GatewayAddress } from '../../../util/TokenUtils'

type ApproveTokenAllowanceProps = {
  address: string
  amount: BigNumber
  sourceChainErc20ContractAddress: string
  l1Signer: Signer
  l1Provider: Provider
  l2Provider: Provider
  nativeCurrency: NativeCurrency
  tokenAllowanceApproval?: () => Promise<boolean>
}

export async function approveTokenAllowance({
  address,
  amount,
  sourceChainErc20ContractAddress,
  l1Signer,
  l1Provider,
  l2Provider,
  tokenAllowanceApproval = async () => {
    return false
  }
}: ApproveTokenAllowanceProps): Promise<boolean> {
  const l1GatewayAddress = await fetchErc20L1GatewayAddress({
    erc20L1Address: sourceChainErc20ContractAddress,
    l1Provider,
    l2Provider
  })

  const allowanceForL1Gateway = await fetchErc20Allowance({
    address: sourceChainErc20ContractAddress,
    provider: l1Provider,
    owner: address,
    spender: l1GatewayAddress
  })

  // need for approval - allowance exhausted
  if (!allowanceForL1Gateway.gte(amount)) {
    const approval = await tokenAllowanceApproval()

    // if user doesn't approve
    if (!approval) return false

    // else, show ask for approval tx in wallet
    const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
    const tx = await erc20Bridger.approveToken({
      erc20L1Address: sourceChainErc20ContractAddress,
      l1Signer
    })

    return true
  }

  // else, no need for approval
  return true
}
