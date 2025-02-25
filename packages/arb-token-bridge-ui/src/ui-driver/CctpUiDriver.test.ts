import {
  CctpUiDriver,
  Dialog,
  UiDriverContext,
  UiDriverStep,
  UiDriverStepDialog
} from './CctpUiDriver'

function expectDialog(step: any, dialog: Dialog) {
  expect(step).toBeDefined()
  expect((step as UiDriverStep).type).toEqual('dialog')
  expect((step as UiDriverStepDialog).dialog).toEqual(dialog)
}

it(`
  isDepositMode=true

  * dialog(cctp_deposit)          -> user rejects
`, async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: true
  } as UiDriverContext)

  const step1 = await (await steps.next()).value
  expectDialog(step1, 'cctp_deposit')

  const step2 = await (await steps.next()).value
  expect(step2).toBeUndefined()
})

it(`
  isDepositMode=true

  * dialog(cctp_deposit)          -> user selects usdc.e
`, async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: true
  } as UiDriverContext)

  const step1 = await (await steps.next()).value
  expectDialog(step1, 'cctp_deposit')
  const step1UserInput = 'bridge-normal-usdce'

  const step2 = await (await steps.next(step1UserInput)).value
  expect(step2).toBeDefined()
  expect((step2 as UiDriverStep).type).toEqual('deposit_usdc.e')

  const step3 = await (await steps.next()).value
  expect(step3).toBeUndefined()
})

it(`
  isDepositMode=true
  isSmartContractWallet=true

  * dialog(cctp_deposit)          -> user selects cctp
  * dialog(custom_dest_addr_warn) -> user rejects
`, async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: true,
    isSmartContractWallet: true
  })

  const step1 = await (await steps.next()).value
  expectDialog(step1, 'cctp_deposit')
  const step1UserInput = 'bridge-cctp-usd'

  const step2 = await (await steps.next(step1UserInput)).value
  expectDialog(step2, 'custom_dest_addr_warn')
  const step2UserInput = false

  const step3 = await (await steps.next(step2UserInput)).value
  expect(step3).toBeUndefined()
})

it(`
  isDepositMode=true
  isSmartContractWallet=true

  * dialog(cctp_deposit)          -> user selects cctp
  * dialog(custom_dest_addr_warn) -> user confirms
`, async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: true,
    isSmartContractWallet: true
  })

  const step1 = await (await steps.next()).value
  expectDialog(step1, 'cctp_deposit')
  const step1UserInput = 'bridge-cctp-usd'

  const step2 = await (await steps.next(step1UserInput)).value
  expectDialog(step2, 'custom_dest_addr_warn')
  const step2UserInput = true

  const step3 = await (await steps.next(step2UserInput)).value
  expect((step3 as UiDriverStep).type).toEqual('end')
})

it(`
  isDepositMode=false
  isSmartContractWallet=false

  * dialog(cctp_withdrawal)       -> user rejects
`, async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: false,
    isSmartContractWallet: false
  })

  const step1 = await (await steps.next()).value
  expectDialog(step1, 'cctp_withdrawal')
  const step1UserInput = false

  const step2 = await (await steps.next(step1UserInput)).value
  expect(step2).toBeUndefined()
})

it(`
  isDepositMode=false
  isSmartContractWallet=true

  * dialog(cctp_withdrawal)       -> user confirms
  * dialog(custom_dest_addr_warn) -> user rejects
`, async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: false,
    isSmartContractWallet: true
  })

  const step1 = await (await steps.next()).value
  expectDialog(step1, 'cctp_withdrawal')
  const step1UserInput = true

  const step2 = await (await steps.next(step1UserInput)).value
  expectDialog(step2, 'custom_dest_addr_warn')
  const step2UserInput = false

  const step3 = await (await steps.next(step2UserInput)).value
  expect(step3).toBeUndefined()
})

it(`
  isDepositMode=false
  isSmartContractWallet=true

  * dialog(cctp_withdrawal)       -> user confirms
  * dialog(custom_dest_addr_warn) -> user confirms
`, async () => {
  const steps = CctpUiDriver.createSteps({
    isDepositMode: false,
    isSmartContractWallet: true
  })

  const step1 = await (await steps.next()).value
  expectDialog(step1, 'cctp_withdrawal')
  const step1UserInput = true

  const step2 = await (await steps.next(step1UserInput)).value
  expectDialog(step2, 'custom_dest_addr_warn')
  const step2UserInput = true

  const step3 = await (await steps.next(step2UserInput)).value
  expect((step3 as UiDriverStep).type).toEqual('end')
})
