import { CctpTransferStarter } from '@/token-bridge-sdk/CctpTransferStarter'
import {
  Provider,
  TransactionReceipt,
  TransactionRequest
} from '@ethersproject/providers'
import { BigNumber, Signer } from 'ethers'
import { trackEvent } from '../util/AnalyticsUtils'
import { DepositStatus, MergedTransaction } from '../state/app/state'
import { AssetType } from '../hooks/arbTokenBridge.types'
import dayjs from 'dayjs'
import { Chain } from 'wagmi'
import { getUsdcTokenAddressFromSourceChainId } from '../state/cctpState'
import { getNetworkName } from '../util/networks'

export type Dialog =
  | 'cctp_deposit'
  | 'cctp_withdrawal'
  | 'cctp_allowance'
  | 'custom_dest_addr_warn'

export type UiDriverStepDialog = {
  type: 'dialog'
  dialog: Dialog
}

export type UiDriverStepTransaction = {
  type: 'tx'
  txRequest: TransactionRequest
}

export type UiDriverStepAddPendingTransaction = {
  type: 'tx_add_pending'
  payload: MergedTransaction
}

export type UiDriverStepAnalytics = {
  type: 'analytics'
  payload: {
    event: Parameters<typeof trackEvent>[0]
    properties?: Parameters<typeof trackEvent>[1]
  }
}

export type UiDriverStep =
  | { type: 'start' }
  | UiDriverStepDialog
  | UiDriverStepTransaction
  | UiDriverStepAnalytics
  | UiDriverStepAddPendingTransaction
  | { type: 'open_tx_history' }
  | { type: 'deposit_usdc.e' }
  | { type: 'scw_delay' }
  | { type: 'return' }
  | { type: 'end' }

export type UiDriverContext = {
  isDepositMode: boolean
  isSmartContractWallet: boolean
  walletAddress?: string
  destinationAddress?: string
  sourceChain: Chain
  sourceChainProvider: Provider
  destinationChain: Chain
  destinationChainProvider: Provider
  signer: Signer
  amount: string
  amountBigNumber: BigNumber
  parentChain: Chain
  childChain: Chain
}

export class CctpUiDriver {
  static async *createSteps(
    context: UiDriverContext
  ): AsyncGenerator<UiDriverStep, any, any> {
    yield { type: 'start' }

    let userInput: boolean | 'bridge-normal-usdce' | 'bridge-cctp-usd'

    if (context.isDepositMode) {
      userInput = yield { type: 'dialog', dialog: 'cctp_deposit' }
    } else {
      userInput = yield {
        type: 'dialog',
        dialog: 'cctp_withdrawal'
      }
    }

    if (userInput === 'bridge-normal-usdce') {
      return yield { type: 'deposit_usdc.e' }
    }

    if (
      context.isSmartContractWallet &&
      // todo: add tests
      addressesEqual(context.walletAddress, context.destinationAddress)
    ) {
      yield {
        type: 'dialog',
        dialog: 'custom_dest_addr_warn'
      }
    }

    const cctpTransferStarter = new CctpTransferStarter({
      sourceChainProvider: context.sourceChainProvider,
      destinationChainProvider: context.destinationChainProvider
    })

    const isTokenApprovalRequired =
      await cctpTransferStarter.requiresTokenApproval({
        amount: context.amountBigNumber,
        signer: context.signer
      })

    if (isTokenApprovalRequired) {
      yield {
        type: 'dialog',
        dialog: 'cctp_allowance'
      }

      if (context.isSmartContractWallet) {
        yield { type: 'scw_delay' }
      }

      yield {
        type: 'tx',
        txRequest:
          await cctpTransferStarter.approveTokenPrepareTransactionRequest({
            amount: context.amountBigNumber,
            signer: context.signer
          })
      }
    }

    if (context.isSmartContractWallet) {
      yield { type: 'scw_delay' }
    }

    const something =
      await cctpTransferStarter.transferPrepareTransactionRequest({
        amount: context.amountBigNumber,
        signer: context.signer,
        destinationAddress: context.destinationAddress
      })

    const receipt: TransactionReceipt = yield {
      type: 'tx',
      txRequest: something.request
    }

    yield {
      type: 'analytics',
      payload: {
        event: context.isDepositMode ? 'CCTP Deposit' : 'CCTP Withdrawal',
        properties: {
          accountType: context.isSmartContractWallet ? 'Smart Contract' : 'EOA',
          network: getNetworkName(context.childChain.id),
          amount: Number(context.amount),
          complete: false,
          version: 2
        }
      }
    }

    yield {
      type: 'tx_add_pending',
      payload: createMergedTransaction(context, receipt.transactionHash)
    }

    yield { type: 'open_tx_history' }
    return { type: 'end' }
  }
}

function addressesEqual(
  address1: string | undefined,
  address2: string | undefined
) {
  return address1?.trim().toLowerCase() === address2?.trim().toLowerCase()
}

function createMergedTransaction(
  {
    isDepositMode,
    walletAddress,
    destinationAddress,
    sourceChain,
    destinationChain,
    amount,
    parentChain,
    childChain
  }: UiDriverContext,
  depositForBurnTxHash: string
): MergedTransaction {
  return {
    txId: depositForBurnTxHash,
    asset: 'USDC',
    assetType: AssetType.ERC20,
    blockNum: null,
    createdAt: dayjs().valueOf(),
    direction: isDepositMode ? 'deposit' : 'withdraw',
    isWithdrawal: !isDepositMode,
    resolvedAt: null,
    status: 'pending',
    uniqueId: null,
    value: amount,
    depositStatus: DepositStatus.CCTP_DEFAULT_STATE,
    destination: destinationAddress ?? walletAddress,
    sender: walletAddress,
    isCctp: true,
    tokenAddress: getUsdcTokenAddressFromSourceChainId(sourceChain.id),
    cctpData: {
      sourceChainId: sourceChain.id,
      attestationHash: null,
      messageBytes: null,
      receiveMessageTransactionHash: null,
      receiveMessageTimestamp: null
    },
    parentChainId: parentChain.id,
    childChainId: childChain.id,
    sourceChainId: sourceChain.id,
    destinationChainId: destinationChain.id
  }
}
