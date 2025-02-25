import {
  CctpUiDriver,
  UiDriverContext,
  UiDriverStep,
  UiDriverStepDialog
} from './CctpUiDriver'

it('deposit: user rejects 1st dialog', async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: true
  } as UiDriverContext)

  const step1 = await (await steps.next()).value
  expect(step1).toBeDefined()
  expect((step1 as UiDriverStep).type).toEqual('dialog')
  expect((step1 as UiDriverStepDialog).dialog).toEqual('cctp_deposit')

  const step2 = await (await steps.next()).value
  expect(step2).toBeUndefined()
})

it('withdrawal: user rejects 1st dialog', async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: false
  } as UiDriverContext)

  const step1 = await (await steps.next()).value
  expect(step1).toBeDefined()
  expect((step1 as UiDriverStep).type).toEqual('dialog')
  expect((step1 as UiDriverStepDialog).dialog).toEqual('cctp_withdrawal')

  const step2 = await (await steps.next(false)).value
  expect(step2).toBeUndefined()
})
