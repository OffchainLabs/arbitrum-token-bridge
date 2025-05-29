import { it } from 'vitest'

import { stepGeneratorForCctp } from './UiDriverCctp'
import { expectStep, nextStep } from './UiDriverTestUtils'

it(`
  context:
    isDepositMode=true
    isSmartContractWallet=false

  user actions:
    1. user rejects "confirm_cctp_deposit" dialog
`, async () => {
  const generator = stepGeneratorForCctp({
    isDepositMode: true,
    isSmartContractWallet: false
  })

  expectStep(await nextStep(generator)).hasType('start')
  expectStep(await nextStep(generator))
    .hasType('dialog')
    .hasPayload('confirm_cctp_deposit')
  expectStep(await nextStep(generator, [false])).hasType('return')
  expectStep(await nextStep(generator)).doesNotExist()
})

it(`
  context:
    isDepositMode=false
    isSmartContractWallet=false

  user actions:
    1. user rejects "confirm_cctp_withdrawal" dialog
`, async () => {
  const generator = stepGeneratorForCctp({
    isDepositMode: false,
    isSmartContractWallet: false
  })

  expectStep(await nextStep(generator)).hasType('start')
  expectStep(await nextStep(generator))
    .hasType('dialog')
    .hasPayload('confirm_cctp_withdrawal')
  expectStep(await nextStep(generator, [false])).hasType('return')
  expectStep(await nextStep(generator)).doesNotExist()
})

it(`
  context:
    isDepositMode=true
    isSmartContractWallet=false
    walletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    destinationAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

  user actions:
    1. user confirms "confirm_cctp_deposit" dialog
`, async () => {
  const generator = stepGeneratorForCctp({
    isDepositMode: true,
    isSmartContractWallet: false,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  })

  expectStep(await nextStep(generator)).hasType('start')
  expectStep(await nextStep(generator))
    .hasType('dialog')
    .hasPayload('confirm_cctp_deposit')
  expectStep(await nextStep(generator, [true])).doesNotExist()
})

it(`
  context:
    isDepositMode=true
    isSmartContractWallet=true
    walletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    destinationAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

  user actions:
    1. user confirms "confirm_cctp_deposit" dialog
    2. user rejects "scw_custom_destination_address" dialog
`, async () => {
  const generator = stepGeneratorForCctp({
    isDepositMode: true,
    isSmartContractWallet: true,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  })

  expectStep(await nextStep(generator)).hasType('start')
  expectStep(await nextStep(generator))
    .hasType('dialog')
    .hasPayload('confirm_cctp_deposit')
  expectStep(await nextStep(generator, [true]))
    .hasType('dialog')
    .hasPayload('scw_custom_destination_address')
  expectStep(await nextStep(generator, [false])).hasType('return')
  expectStep(await nextStep(generator)).doesNotExist()
})

it(`
  context:
    isDepositMode=true
    isSmartContractWallet=true
    walletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    destinationAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

  user actions:
    1. user confirms "confirm_cctp_deposit" dialog
    2. user confirms "scw_custom_destination_address" dialog
`, async () => {
  const generator = stepGeneratorForCctp({
    isDepositMode: true,
    isSmartContractWallet: true,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  })

  expectStep(await nextStep(generator)).hasType('start')
  expectStep(await nextStep(generator))
    .hasType('dialog')
    .hasPayload('confirm_cctp_deposit')
  expectStep(await nextStep(generator, [true]))
    .hasType('dialog')
    .hasPayload('scw_custom_destination_address')
  expectStep(await nextStep(generator, [true])).doesNotExist()
})
