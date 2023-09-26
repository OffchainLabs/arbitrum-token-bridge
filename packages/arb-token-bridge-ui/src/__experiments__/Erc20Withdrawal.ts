import { Provider, TransactionReceipt } from '@ethersproject/providers'

import { L2TransactionReceipt } from '@arbitrum/sdk/dist/lib/message/L2Transaction'

import {
  BridgeTransfer,
  BridgeTransferStatusFunctionProps,
  BridgeTransferStatusFunctionResult
} from './BridgeTransfer'
import { Signer } from 'ethers'
import { L2ToL1Message } from '@arbitrum/sdk'

export class EthDeposit extends BridgeTransfer {
  protected fromChainProvider: Provider
  protected fromChainTxReceipt: L2TransactionReceipt

  private constructor(props: {
    fromChainProvider: Provider
    fromChainTxReceipt: L2TransactionReceipt
  }) {
    super()

    this.fromChainProvider = props.fromChainProvider
    this.fromChainTxReceipt = props.fromChainTxReceipt
  }

  public static async create(props: {
    fromChainProvider: Provider
    fromChainTxHash: string
  }) {
    const txReceipt = await props.fromChainProvider.getTransactionReceipt(
      props.fromChainTxHash
    )

    return new EthDeposit({
      fromChainProvider: props.fromChainProvider,
      fromChainTxReceipt: txReceipt as L2TransactionReceipt
    })
  }

  public async status(
    props: BridgeTransferStatusFunctionProps
  ): Promise<BridgeTransferStatusFunctionResult> {
    // return 'from_chain_tx_error'
    // const [message] = await this.fromChainTxReceipt.getEthDeposits(
    //   props.toChainProvider
    // )

    // not yet created
    // if (typeof message === 'undefined') {
    //   return 'from_chain_tx_success'
    // }

    return 'to_chain_tx_success'
  }

  public async complete(props: {
    toChainSigner: Signer
    toChainProvider: Provider
  }) {
    const [event] = this.fromChainTxReceipt.getL2ToL1Events()

    if (typeof event === 'undefined') {
      throw new Error('event not found')
    }

    return L2ToL1Message.fromEvent(
      props.toChainSigner,
      event,
      props.toChainProvider
    ).execute(this.fromChainProvider)
  }
}
