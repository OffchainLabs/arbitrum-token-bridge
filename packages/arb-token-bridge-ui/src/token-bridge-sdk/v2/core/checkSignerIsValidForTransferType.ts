import { Signer } from 'ethers'
import { isNetwork } from '../../../util/networks'
import { TransferType } from '../BridgeTransferStarterV2'
import { getProviderFromSigner } from './getProviderFromSigner'
import { getChainIdFromProvider } from './getChainIdFromProvider'
import { Provider } from '@ethersproject/providers'

/*
    Returns boolean value to indicate whether the connected signer supports deposit or withdrawal.
    We should throw an error if the user tries to perform deposit/withdrawal if not connected to network supporting it.
    Helpful in showing a prompt to switch to correct network.
*/
export const checkSignerIsValidForTransferType = async ({
  signer,
  destinationChainProvider,
  transferType
}: {
  signer: Signer
  destinationChainProvider: Provider
  transferType: TransferType
}) => {
  const sourceChainProvider = getProviderFromSigner(signer)
  if (sourceChainProvider) {
    const signerChainId = await getChainIdFromProvider(sourceChainProvider)
    const destinationChainId = await getChainIdFromProvider(
      destinationChainProvider
    )

    const isBaseChainEthereum =
      isNetwork(signerChainId).isEthereumMainnetOrTestnet
    const isBaseChainArbitrum = isNetwork(signerChainId).isArbitrum
    const isDestinationChainOrbit = isNetwork(destinationChainId).isOrbitChain

    const isValidDepositChain =
      isBaseChainEthereum || (isBaseChainArbitrum && isDestinationChainOrbit)

    const isValidWithdrawalChain = !isValidDepositChain

    if (transferType.includes('deposit') && !isValidDepositChain) return false

    if (transferType.includes('withdrawal') && !isValidWithdrawalChain)
      return false

    return true
  }

  return false
}
