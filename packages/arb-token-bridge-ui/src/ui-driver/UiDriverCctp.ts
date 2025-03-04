import { step, UiDriverStepGenerator } from './UiDriver'

export const stepGeneratorForCctp: UiDriverStepGenerator = async function* () {
  yield* step({ type: 'start' })
}
