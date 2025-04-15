import { expect } from 'vitest'

import { UiDriverStep, UiDriverStepResultFor } from './UiDriver'

export async function nextStep<TStep extends UiDriverStep>(
  generator: AsyncGenerator<TStep, void, UiDriverStepResultFor<TStep>>,
  nextStepInputs: [] | [UiDriverStepResultFor<TStep>] = []
) {
  return (await generator.next(...nextStepInputs)).value
}

export function expectStep<TStep extends UiDriverStep>(step: TStep | void) {
  return {
    hasType<TStepType extends TStep['type']>(expectedStepType: TStepType) {
      expect(step).toBeDefined()
      expect(step!.type).toEqual(expectedStepType)
      return expectStep(step as Extract<TStep, { type: TStepType }>)
    },

    hasPayload<TExpected extends Extract<TStep, { payload: any }>['payload']>(
      expectedStepPayload: TExpected
    ) {
      if (!('payload' in step!)) {
        throw new Error(`Step of type "${step!.type}" does not have a payload.`)
      }

      expect(step.payload).toEqual(expectedStepPayload)
      return this
    },

    doesNotExist() {
      expect(step).toBeUndefined()
    }
  }
}
