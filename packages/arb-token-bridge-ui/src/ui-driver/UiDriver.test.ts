import {
  UiDriverContext,
  UiDriverStepGenerator,
  UiDriverStepExecutor,
  drive
} from './UiDriver'
import { it, expect } from 'vitest'

it('successfully does step execution', async () => {
  let counter = 0

  const generator: UiDriverStepGenerator = async function* () {
    yield { type: 'start' }
    yield { type: 'start' }
    yield { type: 'start' }
    yield { type: 'start' }
  }

  const executor: UiDriverStepExecutor = async function (_, step) {
    if (step.type === 'start') {
      counter += 1
    }
  }

  // the real ui context is not needed for the test
  await drive(generator, executor, {} as UiDriverContext)

  expect(counter).toEqual(4)
})

it('successfully does early return', async () => {
  let counter = 0

  const generator: UiDriverStepGenerator = async function* () {
    yield { type: 'start' }
    yield { type: 'start' }
    yield { type: 'return' }
    yield { type: 'start' }
    yield { type: 'start' }
  }

  const executor: UiDriverStepExecutor = async function (_, step) {
    if (step.type === 'start') {
      counter += 1
    }
  }

  // the real ui context is not needed for the test
  await drive(generator, executor, {} as UiDriverContext)

  expect(counter).toEqual(2)
})
