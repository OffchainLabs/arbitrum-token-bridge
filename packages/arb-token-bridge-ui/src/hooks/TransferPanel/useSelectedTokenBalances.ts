import { BigNumber, constants } from 'ethers'
import { useMemo } from 'react'
import { useAppState } from '../../state'
import { useNetworks } from '../useNetworks'
import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC
} from '../../util/TokenUtils'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { isNetwork } from '../../util/networks'
import { useBalances } from '../useBalances'

export type Balances = {
  parentBalance: BigNumber | null
  childBalance: BigNumber | null
}

export function useSelectedTokenBalances(): Balances {
  const { app } = useAppState()
  const { selectedToken } = app
  const [networks] = useNetworks()

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
      parentBalance: null,
      childBalance: null
    }

    if (!selectedToken) {
      return result
    }

    if (erc20ParentBalances) {
      result.parentBalance =
        erc20ParentBalances[selectedToken.address.toLowerCase()] ?? null
    }

    if (
      erc20ChildBalances &&
      selectedToken.l2Address &&
      selectedToken.l2Address in erc20ChildBalances
    ) {
      result.childBalance =
        erc20ChildBalances[selectedToken.l2Address.toLowerCase()] ??
        constants.Zero
    }

    // token not bridged to the child chain, show zero
    if (!selectedToken.l2Address) {
      result.childBalance = constants.Zero
    }

    if (
      isTokenArbitrumOneNativeUSDC(selectedToken.address) &&
      isEthereumArbitrumOnePair &&
      erc20ParentBalances &&
      erc20ChildBalances
    ) {
      return {
        parentBalance:
          erc20ParentBalances[CommonAddress.Ethereum.USDC.toLowerCase()] ??
          null,
        childBalance:
          erc20ChildBalances[selectedToken.address.toLowerCase()] ?? null
      }
    }
    if (
      isTokenArbitrumSepoliaNativeUSDC(selectedToken.address.toLowerCase()) &&
      isSepoliaArbSepoliaPair &&
      erc20ParentBalances &&
      erc20ChildBalances
    ) {
      return {
        parentBalance:
          erc20ParentBalances[CommonAddress.Sepolia.USDC.toLowerCase()] ?? null,
        childBalance:
          erc20ChildBalances[selectedToken.address.toLowerCase()] ?? null
      }
    }

    return result
  }, [
    erc20ParentBalances,
    erc20ChildBalances,
    isEthereumArbitrumOnePair,
    isSepoliaArbSepoliaPair,
    selectedToken
  ])
}
