import { stepGeneratorForCctp } from './UiDriverCctp'
import { expectStartStep, expectDialogStep } from './UiDriverTestUtils'

it(`successfully returns steps for context:

  isDepositMode=true
  isSmartContractWallet=false
`, async () => {
  const generator = stepGeneratorForCctp({
    isDepositMode: true,
    isSmartContractWallet: false
  })

  const step1 = await (await generator.next()).value
  expectStartStep(step1)

  const step2 = await (await generator.next()).value
  expectDialogStep(step2, 'cctp_deposit')
})

it(`successfully returns steps for context:

  isDepositMode=false
  isSmartContractWallet=false
`, async () => {
  const generator = stepGeneratorForCctp({
    isDepositMode: false,
    isSmartContractWallet: false
  })

  const step1 = await (await generator.next()).value
  expectStartStep(step1)

  const step2 = await (await generator.next()).value
  expectDialogStep(step2, 'cctp_withdrawal')
})
