import { step, UiDriverStepGenerator } from './UiDriver'
import {
  stepGeneratorForDialog,
  stepGeneratorForDialogToCheckScwDestinationAddress
} from './UiDriverCommon'

export const stepGeneratorForCctp: UiDriverStepGenerator = async function* (
  context
) {
  const deposit = context.isDepositMode
  const dialog = `confirm_cctp_${deposit ? 'deposit' : 'withdrawal'}` as const

  yield* step({ type: 'start' })
  yield* stepGeneratorForDialog(dialog)
  yield* stepGeneratorForDialogToCheckScwDestinationAddress(context)
}
