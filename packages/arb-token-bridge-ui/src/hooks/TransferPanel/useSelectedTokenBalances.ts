import { BigNumber, constants } from 'ethers'
import { useMemo } from 'react'

import { useNetworks } from '../useNetworks'
import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC
} from '../../util/TokenUtils'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { isNetwork } from '../../util/networks'
import { useSelectedToken } from '../useSelectedToken'
import { useBalances } from '../useBalances'
import { useNetworksRelationship } from '../useNetworksRelationship'

export type Balances = {
  sourceBalance: BigNumber | null
  destinationBalance: BigNumber | null
}

export function useSelectedTokenBalances(): Balances {
  const [selectedToken] = useSelectedToken()
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)

  const {
    isArbitrumOne: isSourceChainArbitrumOne,
    isEthereumMainnet: isSourceChainEthereum,
    isSepolia: isSourceChainSepolia,
    isArbitrumSepolia: isSourceChainArbitrumSepolia
  } = isNetwork(networks.sourceChain.id)
  const {
    isArbitrumOne: isDestinationChainArbitrumOne,
    isEthereumMainnet: isDestinationChainEthereum,
    isSepolia: isDestinationChainSepolia,
    isArbitrumSepolia: isDestinationChainArbitrumSepolia
  } = isNetwork(networks.destinationChain.id)

  const isSepoliaArbSepoliaPair =
    (isSourceChainSepolia && isDestinationChainArbitrumSepolia) ||
    (isSourceChainArbitrumSepolia && isDestinationChainSepolia)

  const isEthereumArbitrumOnePair =
    (isSourceChainEthereum && isDestinationChainArbitrumOne) ||
    (isSourceChainArbitrumOne && isDestinationChainEthereum)

  const { erc20ParentBalances, erc20ChildBalances } = useBalances()

  return useMemo(() => {
    const result: Balances = {
      sourceBalance: null,
      destinationBalance: null
    }

    if (!selectedToken) {
      return result
    }

    let parentBalance: BigNumber | null = null
    let childBalance: BigNumber | null = null

    if (erc20ParentBalances) {
      parentBalance =
        erc20ParentBalances[selectedToken.address.toLowerCase()] ?? null
    }

    if (
      erc20ChildBalances &&
      selectedToken.l2Address &&
      selectedToken.l2Address in erc20ChildBalances
    ) {
      childBalance =
        erc20ChildBalances[selectedToken.l2Address.toLowerCase()] ??
        constants.Zero
    }

    // token not bridged to the child chain, show zero
    if (!selectedToken.l2Address) {
      childBalance = constants.Zero
    }

    if (
      isTokenArbitrumOneNativeUSDC(selectedToken.address) &&
      isEthereumArbitrumOnePair
    ) {
      parentBalance =
        erc20ParentBalances?.[CommonAddress.Ethereum.USDC.toLowerCase()] ?? null
      childBalance =
        erc20ChildBalances?.[selectedToken.address.toLowerCase()] ?? null
    }
    if (
      isTokenArbitrumSepoliaNativeUSDC(selectedToken.address.toLowerCase()) &&
      isSepoliaArbSepoliaPair
    ) {
      parentBalance =
        erc20ParentBalances?.[CommonAddress.Sepolia.USDC.toLowerCase()] ?? null
      childBalance =
        erc20ChildBalances?.[selectedToken.address.toLowerCase()] ?? null
    }

    if (isDepositMode) {
      return {
        sourceBalance: parentBalance,
        destinationBalance: childBalance
      }
    }

    return {
      sourceBalance: childBalance,
      destinationBalance: parentBalance
    }
  }, [
    erc20ParentBalances,
    erc20ChildBalances,
    isEthereumArbitrumOnePair,
    isSepoliaArbSepoliaPair,
    selectedToken,
    isDepositMode
  ])
}
