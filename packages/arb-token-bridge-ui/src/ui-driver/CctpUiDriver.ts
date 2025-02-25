export type Dialog =
  | 'cctp_deposit'
  | 'cctp_withdrawal'
  | 'custom_dest_addr_warn'
  | 'test'

export type UiDriverStepDialog = {
  type: 'dialog'
  dialog: Dialog
}

export type UiDriverStep = UiDriverStepDialog

export type UiDriverContext = {
  isDepositMode: boolean
  isSmartContractWallet: boolean
}

export class CctpUiDriver {
  static async *createSteps(
    context: UiDriverContext
  ): AsyncGenerator<UiDriverStep, void, boolean> {
    const step1UserInput = yield {
      type: 'dialog',
      dialog: context.isDepositMode ? 'cctp_deposit' : 'cctp_withdrawal'
    }

    if (!step1UserInput) {
      return
    }

    if (context.isSmartContractWallet) {
      const step2UserInput = yield {
        type: 'dialog',
        dialog: 'custom_dest_addr_warn'
      }

      if (!step2UserInput) {
        return
      }
    }

    yield {
      type: 'dialog',
      dialog: 'test'
    }
  }
}
