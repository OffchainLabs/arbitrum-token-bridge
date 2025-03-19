import { UiDriverStep } from './UiDriver'

export function expectStartStep(step: UiDriverStep | void) {
  expect(step).toBeDefined()
  expect(step!.type).toEqual('start')
}
