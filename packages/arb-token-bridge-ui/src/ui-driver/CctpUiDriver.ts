import { CctpTransferStarter } from '@/token-bridge-sdk/CctpTransferStarter'
import { Provider, TransactionRequest } from '@ethersproject/providers'
import { BigNumber, Signer } from 'ethers'

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

export type UiDriverStep =
  | UiDriverStepDialog
  | UiDriverStepTransaction
  | { type: 'deposit_usdc.e' }
  | { type: 'scw_delay' }
  | { type: 'return' }

export type UiDriverContext = {
  isDepositMode: boolean
  isSmartContractWallet: boolean
  walletAddress?: string
  destinationAddress?: string
  sourceChainProvider: Provider
  destinationChainProvider: Provider
  signer: Signer
  amount: BigNumber
}

export class CctpUiDriver {
  static async *createSteps(
    context: UiDriverContext
  ): AsyncGenerator<UiDriverStep, any, any> {
    if (context.isDepositMode) {
      const userInput: false | 'bridge-normal-usdce' | 'bridge-cctp-usd' =
        yield { type: 'dialog', dialog: 'cctp_deposit' }

      if (!userInput) {
        return yield { type: 'return' }
      }

      if (userInput === 'bridge-normal-usdce') {
        yield { type: 'deposit_usdc.e' }
        return yield { type: 'return' }
      }
    } else {
      const userInput: boolean = yield {
        type: 'dialog',
        dialog: 'cctp_withdrawal'
      }

      if (!userInput) {
        return yield { type: 'return' }
      }
    }

    if (
      context.isSmartContractWallet &&
      // todo: add tests
      addressesEqual(context.walletAddress, context.destinationAddress)
    ) {
      const userInput: boolean = yield {
        type: 'dialog',
        dialog: 'custom_dest_addr_warn'
      }

      if (!userInput) {
        return yield { type: 'return' }
      }
    }

    const cctpTransferStarter = new CctpTransferStarter({
      sourceChainProvider: context.sourceChainProvider,
      destinationChainProvider: context.destinationChainProvider
    })

    const isTokenApprovalRequired =
      await cctpTransferStarter.requiresTokenApproval({
        amount: context.amount,
        signer: context.signer
      })

    if (isTokenApprovalRequired) {
      const userInput: boolean = yield {
        type: 'dialog',
        dialog: 'cctp_allowance'
      }

      if (!userInput) {
        return yield { type: 'return' }
      }

      if (context.isSmartContractWallet) {
        yield { type: 'scw_delay' }
      }

      yield {
        type: 'tx',
        txRequest:
          await cctpTransferStarter.approveTokenPrepareTransactionRequest({
            amount: context.amount,
            signer: context.signer
          })
      }
    }

    if (context.isSmartContractWallet) {
      yield { type: 'scw_delay' }
    }
  }
}

function addressesEqual(
  address1: string | undefined,
  address2: string | undefined
) {
  return address1?.trim().toLowerCase() === address2?.trim().toLowerCase()
}
