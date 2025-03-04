export type Dialog =
  | 'cctp_deposit'
  | 'cctp_withdrawal'
  | 'custom_dest_addr_warn'

export type DialogResult<TDialog extends Dialog> = //
  TDialog extends 'cctp_deposit'
    ? false | 'bridge-normal-usdce' | 'bridge-cctp-usd'
    : // other dialogs resolve to a boolean
      boolean

export type UiDriverContext = {
  isDepositMode: boolean
  isSmartContractWallet: boolean
  walletAddress?: string
  destinationAddress?: string
}

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
    ? Promise<DialogResult<TDialog>>
    : //
    TStep extends { type: 'deposit_usdc.e' }
    ? Promise<false | undefined>
    : //
    TStep extends { type: 'return' }
    ? void
    : //
      never

export type UiDriverStepExecutor<TStep extends UiDriverStep = UiDriverStep> = (
  step: TStep
) => UiDriverStepResult<TStep>
