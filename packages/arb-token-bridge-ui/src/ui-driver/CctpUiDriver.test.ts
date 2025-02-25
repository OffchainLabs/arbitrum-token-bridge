import {
  CctpUiDriver,
  UiDriverContext,
  UiDriverStep,
  UiDriverStepDialog
} from './CctpUiDriver'

it('deposits', async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: true
  } as UiDriverContext)

  const step1 = await (await steps.next()).value

  expect(step1).toBeDefined()
  expect((step1 as UiDriverStep).type).toEqual('dialog')
  expect((step1 as UiDriverStepDialog).dialog).toEqual('cctp_deposit')
})

it('withdrawals', async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: false
  } as UiDriverContext)

  const step1 = await (await steps.next()).value

  expect(step1).toBeDefined()
  expect((step1 as UiDriverStep).type).toEqual('dialog')
  expect((step1 as UiDriverStepDialog).dialog).toEqual('cctp_withdrawal')
})
