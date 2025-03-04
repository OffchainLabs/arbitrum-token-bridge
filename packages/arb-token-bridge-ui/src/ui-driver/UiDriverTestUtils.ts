import { Dialog, UiDriverStep, UiDriverStepResultFor } from './UiDriver'

export async function nextStep<TStep extends UiDriverStep>(
  generator: AsyncGenerator<TStep, void, UiDriverStepResultFor<TStep>>
) {
  return (await generator.next()).value
}

export function expectStepStart(step: UiDriverStep | void) {
  expect(step).toBeDefined()
  expect(step!.type).toEqual('start')
}

export function expectStepDialog(step: UiDriverStep | void, dialog: Dialog) {
  expect(step).toBeDefined()
  expect(step!.type).toEqual('dialog')
  expect((step as { payload: Dialog }).payload).toEqual(dialog)
}
