import { type Address, type PublicClient, type WalletClient } from 'viem'
import { type L2Network } from '@arbitrum/sdk'
import { BridgeTransfer, TransferType } from './BridgeTransferStarter'
import { providers } from 'ethers'
import { rpcURLs } from '../util/networks'

export class EthDepositStarterViem {
  constructor(
    protected readonly l1PublicClient: PublicClient,
    protected readonly l2PublicClient: PublicClient,
    protected readonly walletClient: WalletClient,
    protected readonly l2Network: L2Network
  ) {}

  async deposit(params: {
    amount: bigint
    from: Address
    to?: Address
  }): Promise<{ hash: `0x${string}`; status: 'success' }> {
    const { amount, from, to } = params

    if (!this.walletClient) {
      throw new Error('Wallet client is undefined')
    }

    if (!this.l2Network) {
      throw new Error('L2Network is undefined')
    }

    console.log('[Debug] EthDepositStarterViem.deposit called with:', {
      amount: amount.toString(),
      from,
      to,
      l2Network: {
        chainID: this.l2Network.chainID,
        ethBridge: !!this.l2Network.ethBridge,
        inbox: this.l2Network.ethBridge?.inbox
      }
    })

    // Use the depositEth function directly from the wallet client
    const hash = await this.walletClient.writeContract({
      address: this.l2Network.ethBridge.inbox as `0x${string}`,
      abi: [
        {
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'l2CallValue', type: 'uint256' },
            { name: 'maxSubmissionCost', type: 'uint256' },
            { name: 'excessFeeRefundAddress', type: 'address' },
            { name: 'callValueRefundAddress', type: 'address' },
            { name: 'maxGas', type: 'uint256' },
            { name: 'gasPriceBid', type: 'uint256' },
            { name: 'data', type: 'bytes' }
          ],
          name: 'createRetryableTicket',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'payable',
          type: 'function'
        }
      ],
      functionName: 'createRetryableTicket',
      args: [
        to ?? from,
        amount,
        BigInt(0), // maxSubmissionCost
        from,
        from,
        BigInt(3000000), // maxGas
        BigInt(1), // gasPriceBid
        '0x' // data
      ],
      value: amount
    })

    console.log('[Debug] EthDepositStarterViem.deposit result:', { hash })

    return { hash, status: 'success' }
  }

  async transfer(params: {
    amount: bigint
    from: Address
    to?: Address
  }): Promise<BridgeTransfer> {
    const result = await this.deposit(params)

    // Check if chain information is available
    if (!this.l1PublicClient.chain?.id || !this.l1PublicClient.chain?.name) {
      throw new Error('L1 chain information missing')
    }
    if (!this.l2PublicClient.chain?.id || !this.l2PublicClient.chain?.name) {
      throw new Error('L2 chain information missing')
    }

    // Create ethers providers from RPC URLs
    const l1Provider = new providers.StaticJsonRpcProvider(
      rpcURLs[this.l1PublicClient.chain.id],
      {
        name: this.l1PublicClient.chain.name,
        chainId: this.l1PublicClient.chain.id
      }
    )

    const l2Provider = new providers.StaticJsonRpcProvider(
      rpcURLs[this.l2PublicClient.chain.id],
      {
        name: this.l2PublicClient.chain.name,
        chainId: this.l2PublicClient.chain.id
      }
    )

    return {
      transferType: 'eth_deposit' as TransferType,
      status: 'pending',
      sourceChainProvider: l1Provider,
      sourceChainTransaction: { hash: result.hash },
      destinationChainProvider: l2Provider
    }
  }
} 