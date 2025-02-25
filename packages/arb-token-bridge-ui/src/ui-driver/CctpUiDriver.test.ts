import {
  CctpUiDriver,
  UiDriverContext,
  UiDriverStep,
  UiDriverStepDialog
} from './CctpUiDriver'

it(`
  isDepositMode=true

  * dialog(cctp_withdrawal) -> user rejects
`, async () => {
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

it(`
  isDepositMode=false,isSmartContractWallet=false

  * dialog(cctp_withdrawal) -> user rejects
`, async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: false,
    isSmartContractWallet: false
  })

  const step1 = await (await steps.next()).value
  expect(step1).toBeDefined()
  expect((step1 as UiDriverStep).type).toEqual('dialog')
  expect((step1 as UiDriverStepDialog).dialog).toEqual('cctp_withdrawal')
  const step1UserInput = false

  const step2 = await (await steps.next(step1UserInput)).value
  expect(step2).toBeUndefined()
})

it(`
  isDepositMode=false,isSmartContractWallet=true

  * dialog(cctp_withdrawal)       -> user confirms
  * dialog(custom_dest_addr_warn) -> user rejects
`, async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: false,
    isSmartContractWallet: true
  })

  const step1 = await (await steps.next()).value
  expect(step1).toBeDefined()
  expect((step1 as UiDriverStep).type).toEqual('dialog')
  expect((step1 as UiDriverStepDialog).dialog).toEqual('cctp_withdrawal')
  const step1UserInput = true

  const step2 = await (await steps.next(step1UserInput)).value
  expect((step2 as UiDriverStep).type).toEqual('dialog')
  expect((step2 as UiDriverStepDialog).dialog).toEqual('custom_dest_addr_warn')
  const step2UserInput = false

  const step3 = await (await steps.next(step2UserInput)).value
  expect(step3).toBeUndefined()
})

it(`
  isDepositMode=false,isSmartContractWallet=true

  * dialog(cctp_withdrawal)       -> user confirms
  * dialog(custom_dest_addr_warn) -> user confirms
`, async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: false,
    isSmartContractWallet: true
  })

  const step1 = await (await steps.next()).value
  expect(step1).toBeDefined()
  expect((step1 as UiDriverStep).type).toEqual('dialog')
  expect((step1 as UiDriverStepDialog).dialog).toEqual('cctp_withdrawal')
  const step1UserInput = true

  const step2 = await (await steps.next(step1UserInput)).value
  expect((step2 as UiDriverStep).type).toEqual('dialog')
  expect((step2 as UiDriverStepDialog).dialog).toEqual('custom_dest_addr_warn')
  const step2UserInput = true

  const step3 = await (await steps.next(step2UserInput)).value
  expect((step3 as UiDriverStep).type).toEqual('dialog')
  expect((step3 as UiDriverStepDialog).dialog).toEqual('test')
})
