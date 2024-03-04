import { ContractTransaction, ContractReceipt } from 'ethers'
import { Provider } from '@ethersproject/providers'

import {
  BridgeTransfer,
  BridgeTransferStatus,
  BridgeTransferFetchStatusFunctionResult,
  TransferType
} from './BridgeTransfer'
import { getAttestationHashAndMessageFromReceipt } from '../util/cctp/getAttestationHashAndMessageFromReceipt'
import { getCctpUtils } from './cctp'
import {
  getBridgeTransferKeyFromProviders,
  getBridgeTransferPropertiesFromProviders,
  getChainIdFromProvider
} from './utils'
import { fetchCompletedCCTPTransferBySourceChainTxHash } from '../util/cctp/fetchCCTP'

export class CctpTransfer extends BridgeTransfer {
  public isPendingUserAction = false
  public requiresClaim = true
  public isClaimable = false
  public claim(): void {
    //no-op
  }

  private constructor(props: {
    key: string
    transferType: TransferType
    status: BridgeTransferStatus
    sourceChainTx: ContractTransaction
    sourceChainTxReceipt?: ContractReceipt
    sourceChainProvider: Provider
    destinationChainProvider: Provider
  }) {
    super(props)
  }

  public static async initializeFromSourceChainTx(props: {
    sourceChainTx: ContractTransaction
    sourceChainProvider: Provider
    destinationChainProvider: Provider
  }) {
    const txKey = await getBridgeTransferKeyFromProviders({
      sourceChainProvider: props.sourceChainProvider,
      destinationChainProvider: props.destinationChainProvider,
      sourceChainTxHash: props.sourceChainTx.hash
    })

    const sourceChainTxReceipt =
      await props.sourceChainProvider.getTransactionReceipt(
        props.sourceChainTx.hash
      )

    let status: BridgeTransferStatus

    if (sourceChainTxReceipt) {
      status =
        sourceChainTxReceipt.status === 0
          ? 'source_chain_tx_error'
          : 'source_chain_tx_success'
    } else {
      status = 'source_chain_tx_pending'
    }

    return new CctpTransfer({
      ...props,
      status,
      sourceChainTxReceipt,
      key: txKey,
      transferType: 'cctp'
    })
  }

  public static async initializeFromSourceChainTxHash(props: {
    sourceChainTxHash: string
    sourceChainProvider: Provider
    destinationChainProvider: Provider
  }) {
    const sourceChainTx = await props.sourceChainProvider.getTransaction(
      props.sourceChainTxHash
    )

    const erc20Deposit = await CctpTransfer.initializeFromSourceChainTx({
      ...props,
      sourceChainTx
    })

    await erc20Deposit.updateStatus()

    return erc20Deposit
  }

  protected isStatusFinal(status: BridgeTransferStatus): boolean {
    if (
      status === 'source_chain_tx_error' ||
      status === 'destination_chain_tx_success'
    ) {
      return true
    }

    return false
  }

  public async updateStatus(): Promise<void> {
    this.status = await this.fetchStatus()
  }

  public async fetchStatus(): BridgeTransferFetchStatusFunctionResult {
    // we don't have a source chain tx receipt yet
    if (!this.sourceChainTxReceipt) {
      // let's fetch it
      this.sourceChainTxReceipt =
        await this.sourceChainProvider.getTransactionReceipt(
          this.sourceChainTx.hash
        )

      // still nothing
      if (!this.sourceChainTxReceipt) {
        return 'source_chain_tx_pending'
      }
    }

    if (this.sourceChainTxReceipt.status === 0) {
      return 'source_chain_tx_error'
    }

    const { attestationHash } = getAttestationHashAndMessageFromReceipt(
      this.sourceChainTxReceipt
    )

    if (!attestationHash) {
      return 'source_chain_tx_pending'
    }

    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)
    const destinationChainId = await getChainIdFromProvider(
      this.destinationChainProvider
    )
    const attestationStatus = await getCctpUtils({
      sourceChainId
    }).fetchAttestation(attestationHash)

    if (attestationStatus.status === 'complete') {
      // either ready to be claimed or already claimed

      const { isDeposit } = await getBridgeTransferPropertiesFromProviders({
        sourceChainProvider: this.sourceChainProvider,
        destinationChainProvider: this.destinationChainProvider
      })

      const destinationChainCctpTransfer =
        await fetchCompletedCCTPTransferBySourceChainTxHash({
          l1ChainId: isDeposit ? sourceChainId : destinationChainId,
          pageNumber: 0,
          pageSize: 1,
          sourceChainTxHash: this.sourceChainTx.hash
        })

      if (destinationChainCctpTransfer) {
        // already claimed
        const destinationChainTxHash =
          destinationChainCctpTransfer.messageReceived.transactionHash

        this.destinationChainTxReceipt =
          await this.destinationChainProvider.getTransactionReceipt(
            destinationChainTxHash
          )

        return 'destination_chain_tx_success'
      } else {
        // ready to be claimed
        this.isClaimable = true
        this.isPendingUserAction = true

        return 'destination_chain_tx_pending'
      }
    }

    return 'source_chain_tx_pending'
  }
}
