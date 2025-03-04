import { Dialog, UiDriverStep } from './UiDriver'

export function expectStartStep(step: UiDriverStep | void) {
  expect(step).toBeDefined()
  expect(step!.type).toEqual('start')
}

export function expectDialogStep(step: UiDriverStep | void, dialog: Dialog) {
  expect(step).toBeDefined()
  expect(step!.type).toEqual('dialog')
  expect((step as { payload: Dialog }).payload).toEqual(dialog)
}
