import { BigNumber, Signer } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { isNetwork } from '../util/networks'

export const getAddressFromSigner = async (signer: Signer) => {
  const address = await signer.getAddress()
  return address
}

export const getChainIdFromProvider = async (provider: Provider) => {
  const network = await provider.getNetwork()
  return network.chainId
}

export const getProviderFromSigner = (signer: Signer) => {
  if (!signer.provider) throw Error('Signer not able to return provider')
  return signer.provider
}

export const getBridgeTransferProperties = async ({
  sourceChainProvider,
  destinationChainProvider,
  sourceChainErc20Address
}: {
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  sourceChainErc20Address?: string
}) => {
  const sourceChainId = await getChainIdFromProvider(sourceChainProvider)
  const destinationChainId = await getChainIdFromProvider(
    destinationChainProvider
  )

  const isBaseChainEthereum =
    isNetwork(sourceChainId).isEthereumMainnetOrTestnet
  const isBaseChainArbitrum = isNetwork(sourceChainId).isArbitrum
  const isDestinationChainOrbit = isNetwork(destinationChainId).isOrbitChain

  const isDeposit =
    isBaseChainEthereum || (isBaseChainArbitrum && isDestinationChainOrbit)

  const isNativeCurrencyTransfer = !sourceChainErc20Address

  const isTeleport = isBaseChainEthereum && isDestinationChainOrbit

  return {
    isDeposit,
    isNativeCurrencyTransfer,
    isTeleport
  }
}

// https://github.com/OffchainLabs/arbitrum-sdk/blob/main/src/lib/message/L1ToL2MessageGasEstimator.ts#L76
export function percentIncrease(
  num: BigNumber,
  increase: BigNumber
): BigNumber {
  return num.add(num.mul(increase).div(100))
}
