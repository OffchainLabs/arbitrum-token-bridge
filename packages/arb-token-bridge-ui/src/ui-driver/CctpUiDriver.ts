export type Dialog =
  | 'cctp_deposit'
  | 'cctp_withdrawal'
  | 'custom_dest_addr_warn'
  | 'test'

export type UiDriverStepDialog = {
  type: 'dialog'
  dialog: Dialog
}

export type UiDriverStep =
  | UiDriverStepDialog
  | { type: 'deposit_usdc.e' }
  | { type: 'end' }

export type UiDriverContext = {
  isDepositMode: boolean
  isSmartContractWallet: boolean
}

export class CctpUiDriver {
  static async *createSteps(
    context: UiDriverContext
  ): AsyncGenerator<UiDriverStep, any, any> {
    if (context.isDepositMode) {
      const userInput: false | 'bridge-normal-usdce' | 'bridge-cctp-usd' =
        yield {
          type: 'dialog',
          dialog: 'cctp_deposit'
        }

      if (!userInput) {
        return
      }

      if (userInput === 'bridge-normal-usdce') {
        yield {
          type: 'deposit_usdc.e'
        }

        return
      }
    } else {
      const userInput: boolean = yield {
        type: 'dialog',
        dialog: 'cctp_withdrawal'
      }

      if (!userInput) {
        return
      }
    }

    if (context.isSmartContractWallet) {
      const userInput = yield {
        type: 'dialog',
        dialog: 'custom_dest_addr_warn'
      }

      if (!userInput) {
        return
      }
    }

    yield {
      type: 'end'
    }
  }
}
