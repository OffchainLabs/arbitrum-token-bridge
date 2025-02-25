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
  static async createSteps(context: UiDriverContext): Promise<UiDriverStep[]> {
    const steps: UiDriverStep[] = [
      {
        type: 'dialog',
        dialog: context.isDepositMode ? 'cctp_deposit' : 'cctp_withdrawal'
      }
    ]

    return steps
  }
}
