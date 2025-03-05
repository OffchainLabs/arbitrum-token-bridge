import { stepGeneratorForCctp } from './UiDriverCctp'
import { nextStep, expectStep } from './UiDriverTestUtils'

it(`successfully returns steps for context:

  isDepositMode=true
  isSmartContractWallet=false
`, async () => {
  const generator = stepGeneratorForCctp({
    isDepositMode: true,
    isSmartContractWallet: false
  })

  const step1 = await nextStep(generator)
  expectStep(step1).hasType('start')

  const step2 = await nextStep(generator)
  expectStep(step2).hasType('dialog').hasPayload('cctp_deposit')

  const step3 = await nextStep(generator, [false])
  expectStep(step3).hasType('return')

  const step4 = await nextStep(generator)
  expectStep(step4).doesNotExist()
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
  expectStep(step1).hasType('start')

  const step2 = await nextStep(generator)
  expectStep(step2).hasType('dialog').hasPayload('cctp_withdrawal')

  const step3 = await nextStep(generator, [false])
  expectStep(step3).hasType('return')

  const step4 = await nextStep(generator)
  expectStep(step4).doesNotExist()
})
