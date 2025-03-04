import { UiDriverStepGenerator } from './UiDriver'

export const stepGeneratorForCctp: UiDriverStepGenerator = async function* () {
  yield { type: 'start' }
}
