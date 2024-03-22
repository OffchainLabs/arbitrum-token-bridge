import { BigNumber, Signer } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { isNetwork } from '../util/networks'
import { isTeleport as isTeleportTransfer } from './teleport'
import {
  Erc20Bridger,
  Erc20L1L3Bridger,
  EthBridger,
  EthL1L3Bridger,
  getL2Network
} from '@arbitrum/sdk'

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

  const isParentChainEthereumMainnetOrTestnet =
    isNetwork(sourceChainId).isEthereumMainnetOrTestnet

  const isParentChainArbitrum = isNetwork(sourceChainId).isArbitrum
  const isDestinationChainOrbit = isNetwork(destinationChainId).isOrbitChain

  const isDeposit =
    isParentChainEthereumMainnetOrTestnet ||
    (isParentChainArbitrum && isDestinationChainOrbit)

  const isNativeCurrencyTransfer =
    typeof sourceChainErc20Address === 'undefined'

  const isWithdrawal =
    (isNetwork(sourceChainId).isArbitrum &&
      isNetwork(destinationChainId).isEthereumMainnetOrTestnet) ||
    (isNetwork(sourceChainId).isOrbitChain &&
      isNetwork(destinationChainId).isArbitrum)

  const isTeleport = isTeleportTransfer({ sourceChainId, destinationChainId })

  return {
    isDeposit,
    isNativeCurrencyTransfer,
    isTeleport: isTeleport,
    isSupported: isDeposit || isWithdrawal || isTeleport
  }
}

// https://github.com/OffchainLabs/arbitrum-sdk/blob/main/src/lib/message/L1ToL2MessageGasEstimator.ts#L76
export function percentIncrease(
  num: BigNumber,
  increase: BigNumber
): BigNumber {
  return num.add(num.mul(increase).div(100))
}

// We cannot hardcode Erc20Bridger anymore in code, especially while dealing with tokens
// this function returns the Bridger matching the set providers
export const getBridger = async ({
  sourceChainProvider,
  destinationChainProvider,
  isNativeCurrencyTransfer = false
}: {
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  isNativeCurrencyTransfer?: boolean
}) => {
  const sourceChainId = await getChainIdFromProvider(sourceChainProvider)
  const destinationChainId = await getChainIdFromProvider(
    destinationChainProvider
  )

  if (isTeleportTransfer({ sourceChainId, destinationChainId })) {
    const l3Network = await getL2Network(destinationChainProvider)

    if (isNativeCurrencyTransfer) {
      return new EthL1L3Bridger(l3Network)
    } else {
      return new Erc20L1L3Bridger(l3Network)
    }
  } else {
    if (isNativeCurrencyTransfer) {
      return EthBridger.fromProvider(destinationChainProvider)
    } else {
      return Erc20Bridger.fromProvider(destinationChainProvider)
    }
  }
}
