import { Erc20Bridger } from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { Signer } from 'ethers'
import { SelectedToken } from '../BridgeTransferStarterV2'

export type ApproveTokenProps = {
  signer: Signer
  selectedToken: SelectedToken
  destinationChainProvider: Provider
}

export const approveToken = async ({
  signer,
  selectedToken,
  destinationChainProvider
}: ApproveTokenProps) => {
  const erc20Bridger = await Erc20Bridger.fromProvider(destinationChainProvider)
  const tx = await erc20Bridger.approveToken({
    erc20L1Address: selectedToken.address,
    l1Signer: signer
  })
  await tx.wait()
}
