import { BigNumber, Signer } from 'ethers'
import { Provider, StaticJsonRpcProvider } from '@ethersproject/providers'

import { isNetwork, rpcURLs } from '../util/networks'
import { ChainId } from '../types/ChainId'
import { BridgeTransferStarterPropsWithChainIds } from './BridgeTransferStarter'
import { isValidTeleportChainPair } from './teleport'
import {
  Erc20Bridger,
  Erc20L1L3Bridger,
  EthBridger,
  EthL1L3Bridger,
  getArbitrumNetwork
} from '@arbitrum/sdk'
import { isDepositMode } from '../util/isDepositMode'
import { EnhancedProvider } from './EnhancedProvider'
import { isValidLifiTransfer } from '../app/api/crosschain-transfers/utils'

export const getAddressFromSigner = async (signer: Signer) => {
  const address = await signer.getAddress()
  return address
}

export const getChainIdFromProvider = async (provider: Provider) => {
  const network = await provider.getNetwork()
  return network.chainId
}

export const getBridgeTransferProperties = (
  props: BridgeTransferStarterPropsWithChainIds
) => {
  const sourceChainId = props.sourceChainId
  const destinationChainId = props.destinationChainId

  const isDestinationChainEthereumMainnetOrTestnet =
    isNetwork(destinationChainId).isEthereumMainnetOrTestnet

  const isSourceChainArbitrum = isNetwork(sourceChainId).isArbitrum
  const isDestinationChainArbitrum = isNetwork(destinationChainId).isArbitrum

  const isSourceChainOrbit = isNetwork(sourceChainId).isOrbitChain

  const { isBase: isDestinationChainBase } = isNetwork(destinationChainId)

  const isDeposit = isDepositMode({ sourceChainId, destinationChainId })

  const isWithdrawal =
    (isSourceChainArbitrum && isDestinationChainEthereumMainnetOrTestnet) || //  l2 arbitrum chains to l1
    (isSourceChainOrbit && isDestinationChainEthereumMainnetOrTestnet) || // l2 orbit chains to l1
    (isSourceChainOrbit && isDestinationChainArbitrum) || // l3 orbit chains to l1
    (isSourceChainOrbit && isDestinationChainBase) // l3 orbit chain to Base l2

  const isTeleport = isValidTeleportChainPair({
    sourceChainId,
    destinationChainId
  })

  const isLifi = isValidLifiTransfer({
    sourceChainId,
    destinationChainId,
    fromToken: props.sourceChainErc20Address
  })

  const isNativeCurrencyTransfer =
    typeof props.sourceChainErc20Address === 'undefined'

  return {
    isDeposit,
    isWithdrawal,
    isNativeCurrencyTransfer,
    isTeleport,
    isSupported: isDeposit || isWithdrawal || isTeleport || isLifi,
    isLifi
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
  sourceChainId,
  destinationChainId,
  isNativeCurrencyTransfer = false
}: {
  sourceChainId: number
  destinationChainId: number
  isNativeCurrencyTransfer?: boolean
}) => {
  const destinationChainProvider = getProviderForChainId(destinationChainId)

  if (isValidTeleportChainPair({ sourceChainId, destinationChainId })) {
    const l3Network = getArbitrumNetwork(destinationChainId)

    return isNativeCurrencyTransfer
      ? new EthL1L3Bridger(l3Network)
      : new Erc20L1L3Bridger(l3Network)
  }

  return isNativeCurrencyTransfer
    ? EthBridger.fromProvider(destinationChainProvider)
    : Erc20Bridger.fromProvider(destinationChainProvider)
}

const getProviderForChainCache: {
  [chainId: number]: StaticJsonRpcProvider
} = {
  // start with empty cache
}

function createProviderWithCache(chainId: ChainId) {
  const rpcUrl = rpcURLs[chainId]

  const provider = new EnhancedProvider(rpcUrl, chainId)
  getProviderForChainCache[chainId] = provider
  return provider
}

export function getProviderForChainId(chainId: ChainId): StaticJsonRpcProvider {
  const cachedProvider = getProviderForChainCache[chainId]

  if (typeof cachedProvider !== 'undefined') {
    return cachedProvider
  }

  return createProviderWithCache(chainId)
}
