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

  const isSourceChainEthereumMainnetOrTestnet =
    isNetwork(sourceChainId).isEthereumMainnetOrTestnet
  const isDestinationChainEthereumMainnetOrTestnet =
    isNetwork(destinationChainId).isEthereumMainnetOrTestnet

  const isSourceChainArbitrum = isNetwork(sourceChainId).isArbitrum
  const isDestinationChainArbitrum = isNetwork(destinationChainId).isArbitrum

  const isSourceChainOrbit = isNetwork(sourceChainId).isOrbitChain
  const isDestinationChainOrbit = isNetwork(destinationChainId).isOrbitChain

  const isDeposit =
    isSourceChainEthereumMainnetOrTestnet ||
    (isSourceChainArbitrum && isDestinationChainOrbit)

  const isWithdrawal =
    (isSourceChainArbitrum && isDestinationChainEthereumMainnetOrTestnet) ||
    (isSourceChainOrbit && isDestinationChainArbitrum)

  const isNativeCurrencyTransfer =
    typeof sourceChainErc20Address === 'undefined'

  return {
    isDeposit,
    isWithdrawal,
    isNativeCurrencyTransfer,
    isSupported: isDeposit || isWithdrawal
  }
}

// https://github.com/OffchainLabs/arbitrum-sdk/blob/main/src/lib/message/L1ToL2MessageGasEstimator.ts#L76
export function percentIncrease(
  num: BigNumber,
  increase: BigNumber
): BigNumber {
  return num.add(num.mul(increase).div(100))
}
