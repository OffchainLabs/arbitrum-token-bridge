// import { ContractTransaction, ContractReceipt } from 'ethers'
// import { Provider } from '@ethersproject/providers'
// import { L1ContractCallTransactionReceipt } from '@arbitrum/sdk/dist/lib/message/L1Transaction'

// import {
//   BridgeTransfer,
//   BridgeTransferStatus,
//   BridgeTransferFetchStatusFunctionResult
// } from './BridgeTransfer'
// import { L1ToL2MessageStatus } from '@arbitrum/sdk'

// export class CctpTransfer extends BridgeTransfer {
//   public requiresClaim = true
//   public isClaimable = false
//   public claim(): void {
//     //no-op
//   }

//   private constructor(props: {
//     status: BridgeTransferStatus
//     sourceChainTx: ContractTransaction
//     sourceChainTxReceipt?: ContractReceipt
//     sourceChainProvider: Provider
//     destinationChainProvider: Provider
//   }) {
//     super(props)
//   }

//   public static async initializeFromSourceChainTx(props: {
//     sourceChainTx: ContractTransaction
//     sourceChainProvider: Provider
//     destinationChainProvider: Provider
//   }) {
//     const sourceChainTxReceipt =
//       await props.sourceChainProvider.getTransactionReceipt(
//         props.sourceChainTx.hash
//       )

//     let status: BridgeTransferStatus

//     if (sourceChainTxReceipt) {
//       status =
//         sourceChainTxReceipt.status === 0
//           ? 'source_chain_tx_error'
//           : 'source_chain_tx_success'
//     } else {
//       status = 'source_chain_tx_pending'
//     }

//     return new CctpTransfer({ ...props, status, sourceChainTxReceipt })
//   }

//   public static async initializeFromSourceChainTxHash(props: {
//     sourceChainTxHash: string
//     sourceChainProvider: Provider
//     destinationChainProvider: Provider
//   }) {
//     const sourceChainTx = await props.sourceChainProvider.getTransaction(
//       props.sourceChainTxHash
//     )

//     const erc20Deposit = await CctpTransfer.initializeFromSourceChainTx({
//       ...props,
//       sourceChainTx
//     })

//     await erc20Deposit.updateStatus()

//     return erc20Deposit
//   }

//   protected isStatusFinal(status: BridgeTransferStatus): boolean {
//     if (
//       status === 'source_chain_tx_error' ||
//       status === 'destination_chain_tx_success'
//     ) {
//       return true
//     }

//     return false
//   }

//   public async updateStatus(): Promise<void> {
//     this.status = await this.fetchStatus()
//   }

//   public async fetchStatus(): BridgeTransferFetchStatusFunctionResult {
//     // we don't have a source chain tx receipt yet
//     if (!this.sourceChainTxReceipt) {
//       // let's fetch it
//       this.sourceChainTxReceipt =
//         await this.sourceChainProvider.getTransactionReceipt(
//           this.sourceChainTx.hash
//         )

//       // still nothing
//       if (!this.sourceChainTxReceipt) {
//         return 'source_chain_tx_pending'
//       }
//     }

//     if (this.sourceChainTxReceipt.status === 0) {
//       return 'source_chain_tx_fa'
//     }
//     if (tx.cctpData?.receiveMessageTransactionHash) {
//       return {
//         ...txWithTxId,
//         status: WithdrawalStatus.EXECUTED
//       }
//     }
//     if (receipt.blockNumber && !tx.blockNum) {
//       // If blockNumber was never set (for example, network switch just after the deposit)
//       const { messageBytes, attestationHash } =
//         getAttestationHashAndMessageFromReceipt(receipt)
//       return {
//         ...txWithTxId,
//         blockNum: receipt.blockNumber,
//         cctpData: {
//           ...tx.cctpData,
//           messageBytes,
//           attestationHash
//         }
//       }
//     }
//     const isConfirmed =
//       tx.createdAt &&
//       dayjs().diff(tx.createdAt, 'second') >
//         requiredL1BlocksBeforeConfirmation * blockTime
//     if (
//       // If transaction claim was set to failure, don't reset to Confirmed
//       tx.status !== WithdrawalStatus.FAILURE &&
//       isConfirmed
//     ) {
//       return {
//         ...txWithTxId,
//         status: WithdrawalStatus.CONFIRMED
//       }
//     }

//     return { ...tx, status: WithdrawalStatus.UNCONFIRMED }
//   }
// }
