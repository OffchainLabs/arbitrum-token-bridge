import { UiDriverStep } from './UiDriver'
import { expect } from 'vitest'

export function expectStartStep(step: UiDriverStep | void) {
  expect(step).toBeDefined()
  expect(step!.type).toEqual('start')
}
