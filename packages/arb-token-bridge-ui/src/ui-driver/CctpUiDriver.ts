export type Dialog = 'cctp_deposit' | 'cctp_withdrawal'

export type UiDriverStepDialog = {
  type: 'dialog'
  dialog: Dialog
}

export type UiDriverStep = UiDriverStepDialog

export type UiDriverContext = {
  isDepositMode: boolean
}

export class CctpUiDriver {
  static async *createSteps(
    context: UiDriverContext
  ): AsyncGenerator<UiDriverStep> {
    yield {
      type: 'dialog',
      dialog: context.isDepositMode ? 'cctp_deposit' : 'cctp_withdrawal'
    }
  }
}
