import { Provider } from '@ethersproject/providers'
import { L1EthDepositTransactionReceipt } from '@arbitrum/sdk/dist/lib/message/L1Transaction'

import {
  BridgeTransfer,
  BridgeTransferStatusFunctionProps,
  BridgeTransferStatusFunctionResult
} from './BridgeTransfer'

type WithOptionalInterval<T> = T & { interval?: number }

export class EthDeposit extends BridgeTransfer {
  protected fromChainProvider: Provider
  protected fromChainTxReceipt: L1EthDepositTransactionReceipt

  private constructor(props: {
    fromChainProvider: Provider
    fromChainTxReceipt: L1EthDepositTransactionReceipt
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
      fromChainTxReceipt: txReceipt as L1EthDepositTransactionReceipt
    })
  }

  public async status(
    props: BridgeTransferStatusFunctionProps
  ): Promise<BridgeTransferStatusFunctionResult> {
    // return 'from_chain_tx_error'
    const [message] = await this.fromChainTxReceipt.getEthDeposits(
      props.toChainProvider
    )

    // not yet created
    if (typeof message === 'undefined') {
      return 'from_chain_tx_success'
    }

    return 'to_chain_tx_success'
  }

  public async watchForStatus(
    props: WithOptionalInterval<BridgeTransferStatusFunctionProps>
  ) {
    const intervalId = setInterval(async () => {
      const status = await this.status(props)

      if (status === 'to_chain_tx_success') {
        clearInterval(intervalId)
      }

      return status
    }, props?.interval ?? 10_000)
  }
}
