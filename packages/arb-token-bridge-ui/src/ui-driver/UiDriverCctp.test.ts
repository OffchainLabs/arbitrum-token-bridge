import { stepGeneratorForCctp } from './UiDriverCctp'
import {
  nextStep,
  expectStepStart,
  expectStepDialog
} from './UiDriverTestUtils'

it(`successfully returns steps for context:

  isDepositMode=true
  isSmartContractWallet=false
`, async () => {
  const generator = stepGeneratorForCctp({
    isDepositMode: true,
    isSmartContractWallet: false
  })

  const step1 = await nextStep(generator)
  expectStepStart(step1)

  const step2 = await nextStep(generator)
  expectStepDialog(step2, 'cctp_deposit')
})

it(`successfully returns steps for context:

  isDepositMode=false
  isSmartContractWallet=false
`, async () => {
  const generator = stepGeneratorForCctp({
    isDepositMode: false,
    isSmartContractWallet: false
  })

  const step1 = await nextStep(generator)
  expectStepStart(step1)

  const step2 = await nextStep(generator)
  expectStepDialog(step2, 'cctp_withdrawal')
})
