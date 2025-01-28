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
import { EnhancedProvider, ProviderOptions } from './EnhancedProvider'

const defaultProviderOptions = {
  enableBatching: false,
  enableCaching: false
}

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

  const isNativeCurrencyTransfer =
    typeof props.sourceChainErc20Address === 'undefined'

  return {
    isDeposit,
    isWithdrawal,
    isNativeCurrencyTransfer,
    isTeleport,
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
    const l3Network = await getArbitrumNetwork(destinationChainId)

    return isNativeCurrencyTransfer
      ? new EthL1L3Bridger(l3Network)
      : new Erc20L1L3Bridger(l3Network)
  }

  return isNativeCurrencyTransfer
    ? EthBridger.fromProvider(destinationChainProvider)
    : Erc20Bridger.fromProvider(destinationChainProvider)
}

const providerInstanceCache: {
  [chainId: number]: StaticJsonRpcProvider
} = {
  // start with empty cache
}

/**
 * Creates a new provider instance with the specified options.
 */
function createProvider(
  chainId: ChainId,
  options: ProviderOptions = defaultProviderOptions
): StaticJsonRpcProvider {
  const rpcUrl = rpcURLs[chainId]
  const { enableBatching, enableCaching } = options

  // Only enable tx receipt caching for testnets by default
  const shouldEnableCaching = enableCaching && isNetwork(chainId).isTestnet

  // Create appropriate provider based on options
  if (enableBatching) {
    return new EnhancedProvider(rpcUrl, chainId, undefined, {
      enableCaching: shouldEnableCaching,
      enableBatching: true
    })
  }

  return shouldEnableCaching
    ? new EnhancedProvider(rpcUrl, chainId, undefined, {
        enableCaching: true,
        enableBatching: false
      })
    : new StaticJsonRpcProvider(rpcUrl, chainId)
}

export function getProviderForChainId(
  chainId: ChainId,
  options: ProviderOptions = defaultProviderOptions
): StaticJsonRpcProvider {
  const cachedProvider = providerInstanceCache[chainId]

  if (typeof cachedProvider !== 'undefined') {
    return cachedProvider
  }

  const provider = createProvider(chainId, options)
  providerInstanceCache[chainId] = provider
  return provider
}
