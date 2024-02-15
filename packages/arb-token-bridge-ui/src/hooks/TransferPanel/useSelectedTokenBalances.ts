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

export type Balances = {
  l1: BigNumber | null
  l2: BigNumber | null
}

export function useSelectedTokenBalances(): Balances {
  const { app } = useAppState()
  const { selectedToken } = app
  const { address: walletAddress } = useAccount()
  const [networks] = useNetworks()
  const { childChainProvider, parentChainProvider, isDepositMode } =
    useNetworksRelationship(networks)
  const { destinationAddress } = useDestinationAddressStore()
  const destinationAddressOrWalletAddress = destinationAddress || walletAddress

  const parentChainWalletAddress = isDepositMode
    ? walletAddress
    : destinationAddressOrWalletAddress

  const childChainWalletAddress = isDepositMode
    ? destinationAddressOrWalletAddress
    : walletAddress

  const {
    erc20: [erc20L1Balances]
  } = useBalance({
    provider: parentChainProvider,
    walletAddress: parentChainWalletAddress
  })
  const {
    erc20: [erc20L2Balances]
  } = useBalance({
    provider: childChainProvider,
    walletAddress: childChainWalletAddress
  })

  return useMemo(() => {
    const result: Balances = {
      l1: null,
      l2: null
    }

    if (!selectedToken) {
      return result
    }

    if (erc20L1Balances) {
      result.l1 = erc20L1Balances[selectedToken.address] ?? null
    }

    if (
      erc20L2Balances &&
      selectedToken.l2Address &&
      selectedToken.l2Address in erc20L2Balances
    ) {
      result.l2 = erc20L2Balances[selectedToken.l2Address] ?? constants.Zero
    }

    // token not bridged to the child chain, show zero
    if (!selectedToken.l2Address) {
      result.l2 = constants.Zero
    }

    if (
      isTokenArbitrumOneNativeUSDC(selectedToken.address) &&
      erc20L1Balances &&
      erc20L2Balances
    ) {
      return {
        l1: erc20L1Balances[CommonAddress.Ethereum.USDC] ?? null,
        l2: erc20L2Balances[selectedToken.address] ?? null
      }
    }
    if (
      isTokenArbitrumSepoliaNativeUSDC(selectedToken.address) &&
      erc20L1Balances &&
      erc20L2Balances
    ) {
      return {
        l1: erc20L1Balances[CommonAddress.Sepolia.USDC] ?? null,
        l2: erc20L2Balances[selectedToken.address] ?? null
      }
    }

    return result
  }, [erc20L1Balances, erc20L2Balances, selectedToken])
}
