import { BigNumber, constants } from 'ethers'
import { useMemo } from 'react'
import { useAppState } from '../../state'
import { useNetworks } from '../useNetworks'
import { useNetworksRelationship } from '../useNetworksRelationship'
import { useDestinationAddressStore } from '../../components/TransferPanel/AdvancedSettings'
import { useAccount } from 'wagmi'
import { useBalance } from '../useBalance'
import {
  isTokenArbitrumOneNativeUSDC,
  isTokenArbitrumSepoliaNativeUSDC
} from '../../util/TokenUtils'
import { CommonAddress } from '../../util/CommonAddressUtils'
import { isNetwork } from '../../util/networks'

export type Balances = {
  parentBalance: BigNumber | null
  childBalance: BigNumber | null
}

export function useSelectedTokenBalances(): Balances {
  const { app } = useAppState()
  const { selectedToken } = app
  const { address: walletAddress } = useAccount()
  const [networks] = useNetworks()
  const { childChain, parentChain, isDepositMode } =
    useNetworksRelationship(networks)
  const { destinationAddress } = useDestinationAddressStore()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress

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

  const parentChainWalletAddress = isDepositMode
    ? walletAddress
    : destinationAddressOrWalletAddress

  const childChainWalletAddress = isDepositMode
    ? destinationAddressOrWalletAddress
    : walletAddress

  const {
    erc20: [erc20L1Balances]
  } = useBalance({
    chainId: parentChain.id,
    walletAddress: parentChainWalletAddress
  })
  const {
    erc20: [erc20L2Balances]
  } = useBalance({
    chainId: childChain.id,
    walletAddress: childChainWalletAddress
  })

  return useMemo(() => {
    const result: Balances = {
      parentBalance: null,
      childBalance: null
    }

    if (!selectedToken) {
      return result
    }

    if (erc20L1Balances) {
      result.parentBalance =
        erc20L1Balances[selectedToken.address.toLowerCase()] ?? null
    }

    if (
      erc20L2Balances &&
      selectedToken.l2Address &&
      selectedToken.l2Address in erc20L2Balances
    ) {
      result.childBalance =
        erc20L2Balances[selectedToken.l2Address.toLowerCase()] ?? constants.Zero
    }

    // token not bridged to the child chain, show zero
    if (!selectedToken.l2Address) {
      result.childBalance = constants.Zero
    }

    if (
      isTokenArbitrumOneNativeUSDC(selectedToken.address) &&
      isEthereumArbitrumOnePair &&
      erc20L1Balances &&
      erc20L2Balances
    ) {
      return {
        parentBalance:
          erc20L1Balances[CommonAddress.Ethereum.USDC.toLowerCase()] ?? null,
        childBalance:
          erc20L2Balances[selectedToken.address.toLowerCase()] ?? null
      }
    }
    if (
      isTokenArbitrumSepoliaNativeUSDC(selectedToken.address.toLowerCase()) &&
      isSepoliaArbSepoliaPair &&
      erc20L1Balances &&
      erc20L2Balances
    ) {
      return {
        parentBalance:
          erc20L1Balances[CommonAddress.Sepolia.USDC.toLowerCase()] ?? null,
        childBalance:
          erc20L2Balances[selectedToken.address.toLowerCase()] ?? null
      }
    }

    return result
  }, [
    erc20L1Balances,
    erc20L2Balances,
    isEthereumArbitrumOnePair,
    isSepoliaArbSepoliaPair,
    selectedToken
  ])
}
