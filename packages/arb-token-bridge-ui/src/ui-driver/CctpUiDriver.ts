export type Dialog =
  | 'cctp_deposit'
  | 'cctp_withdrawal'
  | 'custom_dest_addr_warn'
  | 'test'

export type UiDriverStepDialog = {
  type: 'dialog'
  dialog: Dialog
}

export type UiDriverStep = UiDriverStepDialog | { type: 'deposit_as_usdc.e' }

export type UiDriverContext = {
  isDepositMode: boolean
  isSmartContractWallet: boolean
}

export class CctpUiDriver {
  static async *createSteps(
    context: UiDriverContext
  ): AsyncGenerator<UiDriverStep, any, any> {
    if (context.isDepositMode) {
      const userInput: boolean = yield {
        type: 'dialog',
        dialog: 'cctp_deposit'
      }

      if (!userInput) {
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
      type: 'dialog',
      dialog: 'test'
    }
  }
}
