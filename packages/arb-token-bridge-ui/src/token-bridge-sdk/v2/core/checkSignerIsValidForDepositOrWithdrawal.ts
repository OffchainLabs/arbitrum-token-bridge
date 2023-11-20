import { Signer } from 'ethers'
import { isNetwork } from '../../../util/networks'

/*
    Returns boolean value to indicate whether the connected signer supports deposit or withdrawal.
    We should throw an error if the user tries to perform deposit/withdrawal if not connected to network supporting it.
    Helpful in showing a prompt to switch to correct network.
*/
export const checkSignerIsValidForDepositOrWithdrawal = async ({
  connectedSigner,
  destinationChainId,
  transferType
}: {
  connectedSigner: Signer
  destinationChainId: number
  transferType: 'deposit' | 'withdrawal'
}) => {
  if (connectedSigner.provider) {
    const signerChainId = (await connectedSigner.provider?.getNetwork?.())
      .chainId

    const isBaseChainEthereum =
      isNetwork(signerChainId).isEthereumMainnetOrTestnet
    const isBaseChainArbitrum = isNetwork(signerChainId).isArbitrum
    const isDestinationChainOrbit = isNetwork(destinationChainId).isOrbitChain

    const isValidDepositChain =
      isBaseChainEthereum || (isBaseChainArbitrum && isDestinationChainOrbit)

    const isValidWithdrawalChain = !isValidDepositChain

    if (transferType === 'deposit' && !isValidDepositChain) return false

    if (transferType === 'withdrawal' && !isValidWithdrawalChain) return false

    return true
  }

  return false
}
