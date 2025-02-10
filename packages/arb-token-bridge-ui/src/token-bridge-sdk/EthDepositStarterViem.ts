import { scaleFrom18DecimalsToNativeTokenDecimals } from '@arbitrum/sdk'
import { approveGasToken, depositEth, depositEthTo } from '@arbitrum/sdk-viem'
import {
  signerToAccount,
  viemTransactionReceiptToEthersTransactionReceipt
} from '@offchainlabs/ethers-viem-compat'
import { BigNumber, ContractTransaction, providers, Signer } from 'ethers'
import { type Address, type PublicClient, type WalletClient } from 'viem'
import { fetchNativeCurrency } from '../hooks/useNativeCurrency'
import { depositEthEstimateGas } from '../util/EthDepositUtils'
import {
  ApproveNativeCurrencyProps,
  BridgeTransfer,
  BridgeTransferStarter,
  TransferProps,
  TransferType
} from './BridgeTransferStarter'
import { getAddressFromSigner, percentIncrease } from './utils'

export class EthDepositStarterViem extends BridgeTransferStarter {
  public transferType: TransferType = 'eth_deposit'
  protected readonly sourcePublicClient: PublicClient
  protected readonly destinationPublicClient: PublicClient
  protected readonly walletClient: WalletClient

  constructor(
    sourcePublicClient: PublicClient,
    destinationPublicClient: PublicClient,
    walletClient: WalletClient,
    initProps: {
      sourceChainProvider: providers.StaticJsonRpcProvider
      destinationChainProvider: providers.StaticJsonRpcProvider
    }
  ) {
    super(initProps)

    this.sourcePublicClient = sourcePublicClient
    this.destinationPublicClient = destinationPublicClient
    this.walletClient = walletClient
  }

  public async requiresNativeCurrencyApproval(): Promise<boolean> {
    // ETH deposits don't require approval
    return false
  }

  public async approveNativeCurrencyEstimateGas(): Promise<BigNumber | void> {
    // ETH deposits don't require approval
    return
  }

  private async getDepositRetryableFees({
    signer,
    amount,
    destinationAddress
  }: {
    signer: Signer
    amount: BigNumber
    destinationAddress?: string
  }) {
    const isCustomDestinationAddress = !!destinationAddress

    if (!isCustomDestinationAddress) {
      return BigNumber.from(0)
    }

    const nativeTokenDecimals = (
      await fetchNativeCurrency({ provider: this.destinationChainProvider })
    ).decimals

    // Eth transfers to a custom destination use retryables
    // In the case of native currency we need to also approve native currency used for gas
    const gasEstimates = await this.transferEstimateGas({
      amount,
      signer,
      destinationAddress
    })

    const gasPrice = percentIncrease(
      await this.destinationChainProvider.getGasPrice(),
      BigNumber.from(5) // 5% increase
    )

    return scaleFrom18DecimalsToNativeTokenDecimals({
      amount: gasEstimates.estimatedChildChainGas
        .mul(gasPrice)
        .add(gasEstimates.estimatedChildChainSubmissionCost),
      decimals: nativeTokenDecimals
    })
  }

  public async approveNativeCurrency({
    signer,
    amount,
    destinationAddress
  }: ApproveNativeCurrencyProps): Promise<ContractTransaction | void> {
    const address = await getAddressFromSigner(signer)
    const account = await signerToAccount(signer)

    const retryableFees = await this.getDepositRetryableFees({
      signer,
      amount,
      destinationAddress
    })

    const result = await approveGasToken(
      this.sourcePublicClient,
      this.destinationPublicClient,
      {
        ...this.walletClient,
        account
      },
      {
        account: address as Address,
        amount: BigInt(amount.add(retryableFees).toString())
      }
    )

    if (result.status !== 'success') {
      throw new Error('Failed to approve gas token')
    }

    // Convert viem transaction to ethers transaction for compatibility
    return {
      hash: result.hash,
      wait: async () => {
        const receipt = await this.sourcePublicClient.waitForTransactionReceipt(
          {
            hash: result.hash
          }
        )
        return viemTransactionReceiptToEthersTransactionReceipt(receipt)
      }
    } as ContractTransaction
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
  }

  public async transferEstimateGas({
    amount,
    signer,
    destinationAddress
  }: TransferEstimateGas) {
    const address = await getAddressFromSigner(signer)

    return depositEthEstimateGas({
      amount,
      address,
      parentChainProvider: this.sourceChainProvider,
      childChainProvider: this.destinationChainProvider,
      destinationAddress
    })
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
