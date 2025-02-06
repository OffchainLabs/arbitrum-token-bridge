import { type Address, type PublicClient, type WalletClient } from 'viem'
import { type L2Network } from '@arbitrum/sdk'
import {
  BridgeTransfer,
  TransferType,
  BridgeTransferStarter,
  TransferProps,
  BridgeTransferStarterProps
} from './BridgeTransferStarter'
import { providers, BigNumber, ContractTransaction } from 'ethers'
import { rpcURLs } from '../util/networks'
import { GasEstimates } from '../hooks/arbTokenBridge.types'
import { depositEth, depositEthTo } from '@arbitrum/sdk-viem'

export class EthDepositStarterViem extends BridgeTransferStarter {
  public transferType: TransferType = 'eth_deposit'
  protected readonly sourcePublicClient: PublicClient
  protected readonly destinationPublicClient: PublicClient
  protected readonly walletClient: WalletClient
  protected readonly destinationNetwork: L2Network

  constructor(
    sourcePublicClient: PublicClient,
    destinationPublicClient: PublicClient,
    walletClient: WalletClient,
    destinationNetwork: L2Network
  ) {
    // Create ethers providers from RPC URLs
    const sourceProvider = new providers.StaticJsonRpcProvider(
      rpcURLs[sourcePublicClient.chain?.id ?? 1],
      {
        name: sourcePublicClient.chain?.name ?? 'mainnet',
        chainId: sourcePublicClient.chain?.id ?? 1
      }
    )

    const destinationProvider = new providers.StaticJsonRpcProvider(
      rpcURLs[destinationPublicClient.chain?.id ?? 42161],
      {
        name: destinationPublicClient.chain?.name ?? 'arbitrum',
        chainId: destinationPublicClient.chain?.id ?? 42161
      }
    )

    super({
      sourceChainProvider: sourceProvider,
      destinationChainProvider: destinationProvider
    })

    this.sourcePublicClient = sourcePublicClient
    this.destinationPublicClient = destinationPublicClient
    this.walletClient = walletClient
    this.destinationNetwork = destinationNetwork
  }

  public async requiresNativeCurrencyApproval(): Promise<boolean> {
    // ETH deposits don't require approval
    return false
  }

  public async approveNativeCurrencyEstimateGas(): Promise<BigNumber | void> {
    // ETH deposits don't require approval
    return
  }

  public async approveNativeCurrency(): Promise<ContractTransaction | void> {
    // ETH deposits don't require approval
    return
  }

  public async requiresTokenApproval(): Promise<boolean> {
    // ETH deposits don't require token approval
    return false
  }

  public async approveTokenEstimateGas(): Promise<BigNumber | void> {
    // ETH deposits don't require token approval
    return
  }

  public async approveToken(): Promise<ContractTransaction | void> {
    // ETH deposits don't require token approval
    return
  }

  public async transferEstimateGas(): Promise<GasEstimates | undefined> {
    // For ETH deposits, we use fixed gas estimates
    return {
      estimatedParentChainGas: BigNumber.from(3000000),
      estimatedChildChainGas: BigNumber.from(1000000)
    }
  }

  private async deposit(params: {
    amount: bigint
    from: Address
    to?: Address
  }): Promise<{ hash: `0x${string}`; status: 'success' }> {
    const { amount, from, to } = params

    if (!this.walletClient) {
      throw new Error('Wallet client is undefined')
    }

    if (!this.destinationNetwork) {
      throw new Error('Destination network is undefined')
    }

    console.log('[Debug] EthDepositStarterViem.deposit called with:', {
      amount: amount.toString(),
      from,
      to,
      destinationNetwork: {
        chainID: this.destinationNetwork.chainID,
        ethBridge: !!this.destinationNetwork.ethBridge,
        inbox: this.destinationNetwork.ethBridge?.inbox
      }
    })

    // Use depositEth or depositEthTo from sdk-viem based on whether a destination address is provided
    const result = to
      ? await depositEthTo(
          this.sourcePublicClient,
          this.destinationPublicClient,
          this.walletClient,
          {
            amount,
            account: from,
            destinationAddress: to
          }
        )
      : await depositEth(
          this.sourcePublicClient,
          this.destinationPublicClient,
          this.walletClient,
          {
            amount,
            account: from
          }
        )

    if (result.status !== 'success') {
      throw new Error('Deposit failed')
    }

    return { hash: result.hash, status: 'success' }
  }

  public async transfer(props: TransferProps): Promise<BridgeTransfer> {
    const result = await this.deposit({
      amount: BigInt(props.amount.toString()),
      from: (await props.signer.getAddress()) as Address,
      to: props.destinationAddress as Address
    })

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: { hash: result.hash },
      destinationChainProvider: this.destinationChainProvider
    }
  }
} 