import { step, UiDriverStepGenerator } from './UiDriver'
import {
  stepGeneratorForDialog,
  stepGeneratorForDialogToCheckScwDestinationAddress
} from './UiDriverCommon'

export const stepGeneratorForCctp: UiDriverStepGenerator = async function* (
  context
) {
  const deposit = context.isDepositMode

  yield* step({ type: 'start' })
  yield* stepGeneratorForDialog(`confirm_cctp_${deposit ? 'deposit' : 'withdrawal'}`)
  yield* stepGeneratorForDialogToCheckScwDestinationAddress(context)
}
