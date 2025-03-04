import { step, UiDriverStepGenerator } from './UiDriver'

export const stepGeneratorForCctp: UiDriverStepGenerator = async function* (
  context
) {
  yield* step({ type: 'start' })

  const userInput = yield* step({
    type: 'dialog',
    payload: context.isDepositMode ? 'cctp_deposit' : 'cctp_withdrawal'
  })

  if (!userInput) {
    yield* step({ type: 'return' })
    return
  }
}
