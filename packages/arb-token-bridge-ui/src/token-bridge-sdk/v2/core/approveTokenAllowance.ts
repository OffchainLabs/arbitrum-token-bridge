import { Erc20Bridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { BigNumber, Signer } from 'ethers'
import { fetchErc20Allowance } from '../../../util/TokenUtils'
import { NativeCurrency } from '../../../hooks/useNativeCurrency'
import { ExternalCallback } from '../BridgeTransferStarterV2'

type ApproveTokenAllowanceProps = {
  address: string
  amount: BigNumber
  tokenAddress: string
  l1Signer: Signer
  l1Provider: Provider
  l2Provider: Provider
  nativeCurrency: NativeCurrency
  spender: string
  tokenAllowanceApproval?: ExternalCallback
}

export async function approveTokenAllowance({
  address,
  amount,
  tokenAddress,
  l1Signer,
  l1Provider,
  l2Provider,
  spender,
  tokenAllowanceApproval = async () => {
    return false
  }
}: ApproveTokenAllowanceProps): Promise<boolean> {
  const allowanceForL1Gateway = await fetchErc20Allowance({
    address: tokenAddress,
    provider: l1Provider,
    owner: address,
    spender
  })

  // need for approval - allowance exhausted
  if (!allowanceForL1Gateway.gte(amount)) {
    const approval = await tokenAllowanceApproval()

    // if user doesn't approve
    if (!approval) return false

    // else, show ask for approval tx in wallet
    const erc20Bridger = await Erc20Bridger.fromProvider(l2Provider)
    const tx = await erc20Bridger.approveToken({
      erc20L1Address: tokenAddress,
      l1Signer
    })

    return true
  }

  // else, no need for approval
  return true
}
