import { BigNumber, Signer } from 'ethers'
import { Provider } from '@ethersproject/providers'

import { isNetwork } from '../util/networks'
import {
  BridgeTransferStarterProps,
  BridgeTransferStarterPropsWithChainIds
} from './BridgeTransferStarter'

export const getAddressFromSigner = async (signer: Signer) => {
  const address = await signer.getAddress()
  return address
}

export const getChainIdFromProvider = async (provider: Provider) => {
  const network = await provider.getNetwork()
  return network.chainId
}

export const getBridgeTransferProperties = async (
  props: BridgeTransferStarterProps | BridgeTransferStarterPropsWithChainIds
) => {
  // if we are passing the chain ids directly, we dont need additional RPC calls to fetch them
  let sourceChainId: number, destinationChainId: number
  if (isBridgeTransferStarterPropsWithChainIds(props)) {
    sourceChainId = props.sourceChainId
    destinationChainId = props.destinationChainId
  } else {
    sourceChainId = await getChainIdFromProvider(props.sourceChainProvider)
    destinationChainId = await getChainIdFromProvider(
      props.destinationChainProvider
    )
  }

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
    typeof props.sourceChainErc20Address === 'undefined'

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

export function isBridgeTransferStarterPropsWithChainIds(
  props: any
): props is BridgeTransferStarterPropsWithChainIds {
  return (
    typeof props.sourceChainId === 'number' &&
    typeof props.destinationChainId === 'number'
  )
}
