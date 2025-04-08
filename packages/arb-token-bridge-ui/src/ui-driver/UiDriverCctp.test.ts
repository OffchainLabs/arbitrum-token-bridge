import { stepGeneratorForCctp } from './UiDriverCctp'
import { expectStartStep } from './UiDriverTestUtils'
import { it } from 'vitest'

it('successfully returns steps', async () => {
  const generator = stepGeneratorForCctp({
    isDepositMode: true,
    isSmartContractWallet: false
  })

  const step1 = await (await generator.next()).value
  expectStartStep(step1)
})
