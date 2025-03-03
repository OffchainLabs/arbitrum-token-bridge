export type Dialog =
  | 'cctp_deposit'
  | 'cctp_withdrawal'
  | 'custom_dest_addr_warn'

export type DialogResult<TDialog extends Dialog> = //
  TDialog extends 'cctp_deposit'
    ? false | 'bridge-normal-usdce' | 'bridge-cctp-usd'
    : // other dialogs resolve to a boolean
      boolean

export type UiDriverStepDialog<TDialog extends Dialog = Dialog> = {
  type: 'dialog'
  dialog: TDialog
}

export type UiDriverStep<TDialog extends Dialog = Dialog> =
  | UiDriverStepDialog<TDialog>
  | { type: 'deposit_usdc.e' }
  | { type: 'return' }

export type UiDriverStepResult<TStep extends UiDriverStep> = //
  TStep extends { type: 'dialog'; dialog: infer TDialog extends Dialog } //
    ? DialogResult<TDialog>
    : //
    TStep extends { type: 'deposit_usdc.e' }
    ? false | undefined
    : //
    TStep extends { type: 'return' }
    ? void
    : //
      never

export type UiDriverContext = {
  isDepositMode: boolean
  isSmartContractWallet: boolean
  walletAddress?: string
  destinationAddress?: string
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
      const userInput = yield {
        type: 'dialog',
        dialog: 'custom_dest_addr_warn'
      }

      if (!userInput) {
        return yield { type: 'return' }
      }
    }
  }
}

function addressesEqual(
  address1: string | undefined,
  address2: string | undefined
) {
  return address1?.trim().toLowerCase() === address2?.trim().toLowerCase()
}
