import { type Address, type PublicClient, type WalletClient } from 'viem'
import { type L2Network } from '@arbitrum/sdk'
import { EthDepositStarterViem } from './EthDepositStarterViem'
import { Erc20DepositStarterViem } from './Erc20DepositStarterViem'

export interface BridgeTransferStarterFactoryParams {
  sourceChainId: number
  sourceChainErc20Address?: Address
  destinationChainId: number
  destinationChainErc20Address?: Address
}

export interface BridgeTransferStarterFactoryDeps {
  l1PublicClient: PublicClient
  l2PublicClient: PublicClient
  walletClient: WalletClient
  l2Network: L2Network
}

export class BridgeTransferStarterFactory {
  static async create(
    params: BridgeTransferStarterFactoryParams,
    deps: BridgeTransferStarterFactoryDeps
  ) {
    const { sourceChainErc20Address } = params
    const { l1PublicClient, l2PublicClient, walletClient, l2Network } = deps

    // If no token address is provided, we're dealing with ETH
    if (!sourceChainErc20Address) {
      return new EthDepositStarterViem(
        l1PublicClient,
        l2PublicClient,
        walletClient,
        l2Network
      )
    }

    // Handle ERC20 tokens
    return new Erc20DepositStarterViem(
      l1PublicClient,
      l2PublicClient,
      walletClient,
      l2Network,
      sourceChainErc20Address
    )
  }
}
