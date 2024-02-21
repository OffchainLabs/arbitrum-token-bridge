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

export const getBridgeTransferProperties = ({
  sourceChainId,
  destinationChainId,
  sourceChainErc20Address
}: {
  sourceChainId: number
  destinationChainId: number
  sourceChainErc20Address?: string
}) => {
  const isBaseChainEthereum =
    isNetwork(sourceChainId).isEthereumMainnetOrTestnet
  const isBaseChainArbitrum = isNetwork(sourceChainId).isArbitrum
  const isDestinationChainOrbit = isNetwork(destinationChainId).isOrbitChain

  const isDeposit =
    isBaseChainEthereum || (isBaseChainArbitrum && isDestinationChainOrbit)

  const isNativeCurrencyTransfer = !sourceChainErc20Address

  return {
    isDeposit,
    isNativeCurrencyTransfer
  }
}

export const getBridgeTransferPropertiesFromProviders = async ({
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
  return getBridgeTransferProperties({
    sourceChainId,
    destinationChainId,
    sourceChainErc20Address
  })
}

// https://github.com/OffchainLabs/arbitrum-sdk/blob/main/src/lib/message/L1ToL2MessageGasEstimator.ts#L76
export function percentIncrease(
  num: BigNumber,
  increase: BigNumber
): BigNumber {
  return num.add(num.mul(increase).div(100))
}

export const getBridgeTransferKey = ({
  sourceChainId,
  destinationChainId,
  sourceChainTxHash
}: {
  sourceChainId: number
  destinationChainId: number
  sourceChainTxHash: string
}) => {
  return `${sourceChainId}_${destinationChainId}_${sourceChainTxHash}`.toLowerCase()
}

export const getBridgeTransferKeyFromProviders = async ({
  sourceChainProvider,
  destinationChainProvider,
  sourceChainTxHash
}: {
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  sourceChainTxHash: string
}) => {
  const sourceChainId = (await sourceChainProvider.getNetwork()).chainId
  const destinationChainId = (await destinationChainProvider.getNetwork())
    .chainId
  return getBridgeTransferKey({
    sourceChainId,
    destinationChainId,
    sourceChainTxHash
  })
}
