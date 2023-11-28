import { Provider } from '@ethersproject/providers'
import { BigNumber } from 'ethers'
import { fetchErc20Allowance } from '../../../util/TokenUtils'
import { SelectedToken } from '../BridgeTransferStarterV2'

export type RequiresTokenApprovalProps = {
  amount: BigNumber
  address: string
  selectedToken: SelectedToken
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  destinationAddress?: string
}

export const requiresTokenApproval = async ({
  amount,
  address,
  selectedToken,
  sourceChainProvider,
  spender
}: Omit<
  RequiresTokenApprovalProps & { spender: string },
  'destinationChainProvider'
>) => {
  const allowanceForL1Gateway = await fetchErc20Allowance({
    address: selectedToken.address,
    provider: sourceChainProvider,
    owner: address,
    spender
  })

  // need for approval - allowance exhausted
  if (!allowanceForL1Gateway.gte(amount)) {
    return true
  }

  return false
}
