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
  expectStep(step2).hasType('dialog').hasPayload('confirm_cctp_deposit')

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
  expectStep(step2).hasType('dialog').hasPayload('confirm_cctp_withdrawal')

  const step3 = await nextStep(generator, [false])
  expectStep(step3).hasType('return')

  const step4 = await nextStep(generator)
  expectStep(step4).doesNotExist()
})

it(`successfully returns steps for context:

  isDepositMode=false
  isSmartContractWallet=false
  walletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
  destinationAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
`, async () => {
  const generator = stepGeneratorForCctp({
    isDepositMode: true,
    isSmartContractWallet: false,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  })

  const step1 = await nextStep(generator)
  expectStep(step1).hasType('start')

  const step2 = await nextStep(generator)
  expectStep(step2).hasType('dialog').hasPayload('confirm_cctp_deposit')

  const step3 = await nextStep(generator, [true])
  expectStep(step3).doesNotExist()
})

it(`successfully returns steps for context:

  isDepositMode=false
  isSmartContractWallet=true
  walletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
  destinationAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
`, async () => {
  const generator = stepGeneratorForCctp({
    isDepositMode: true,
    isSmartContractWallet: true,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  })

  const step1 = await nextStep(generator)
  expectStep(step1).hasType('start')

  const step2 = await nextStep(generator)
  expectStep(step2).hasType('dialog').hasPayload('confirm_cctp_deposit')

  const step3 = await nextStep(generator, [true])
  expectStep(step3)
    .hasType('dialog')
    .hasPayload('scw_custom_destination_address')

  const step4 = await nextStep(generator, [false])
  expectStep(step4).hasType('return')

  const step5 = await nextStep(generator)
  expectStep(step5).doesNotExist()
})
