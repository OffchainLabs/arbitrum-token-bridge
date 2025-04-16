import { it } from 'vitest'
import { BigNumber } from 'ethers'
import { TransactionReceipt } from '@ethersproject/providers'
import { BridgeTransferStarter } from '@/token-bridge-sdk/BridgeTransferStarter'

import { UiDriverContext } from './UiDriver'
import { stepGeneratorForCctp } from './UiDriverCctp'
import { nextStep, expectStep } from './UiDriverTestUtils'

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
  } as UiDriverContext)

  const step1 = await nextStep(generator)
  expectStep(step1).hasType('start')

  const step2 = await nextStep(generator)
  expectStep(step2).hasType('dialog').hasPayload('confirm_cctp_deposit')

  const step3 = await nextStep(generator, [false])
  expectStep(step3).hasType('return')
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
  } as UiDriverContext)

  const step1 = await nextStep(generator)
  expectStep(step1).hasType('start')

  const step2 = await nextStep(generator)
  expectStep(step2).hasType('dialog').hasPayload('confirm_cctp_withdrawal')

  const step3 = await nextStep(generator, [false])
  expectStep(step3).hasType('return')
})

it(`
  context:
    isDepositMode=true
    isSmartContractWallet=false
    walletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    destinationAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

  more context:
    requires token approval

  user actions:
    1. user confirms "confirm_cctp_deposit" dialog
    2. user rejects "approve_token" dialog
`, async () => {
  const generator = stepGeneratorForCctp({
    amountBigNumber: BigNumber.from(1),
    isDepositMode: true,
    isSmartContractWallet: false,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    transferStarter: {
      requiresTokenApproval: () => true
    } as unknown as BridgeTransferStarter
  })

  const step1 = await nextStep(generator)
  expectStep(step1).hasType('start')

  const step2 = await nextStep(generator)
  expectStep(step2).hasType('dialog').hasPayload('confirm_cctp_deposit')

  const step3 = await nextStep(generator, [true])
  expectStep(step3).hasType('dialog').hasPayload('approve_token')

  const step4 = await nextStep(generator, [false])
  expectStep(step4).hasType('return')
})

it.only(`
  context:
    isDepositMode=true
    isSmartContractWallet=false
    walletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    destinationAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

  more context:
    requires token approval

  user actions:
    1. user confirms "confirm_cctp_deposit" dialog
    2. user confirms "approve_token" dialog
    3. token approval tx fails
`, async () => {
  const mockTxRequest = {
    to: '1',
    data: '2',
    value: 0
  }

  const generator = stepGeneratorForCctp({
    amountBigNumber: BigNumber.from(1),
    isDepositMode: true,
    isSmartContractWallet: false,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    transferStarter: {
      requiresTokenApproval: () => true,
      approveTokenPrepareTxRequest: () => mockTxRequest
    } as unknown as BridgeTransferStarter
  })

  const step1 = await nextStep(generator)
  expectStep(step1).hasType('start')

  const step2 = await nextStep(generator)
  expectStep(step2).hasType('dialog').hasPayload('confirm_cctp_deposit')

  const step3 = await nextStep(generator, [true])
  expectStep(step3).hasType('dialog').hasPayload('approve_token')

  const step4 = await nextStep(generator, [true])
  expectStep(step4).hasType('tx').hasPayload(mockTxRequest)

  const step5 = await nextStep(generator, [{ error: new Error() }])
  expectStep(step5).hasType('return')
})

it.only(`
  context:
    isDepositMode=true
    isSmartContractWallet=false
    walletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    destinationAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

  more context:
    requires token approval

  user actions:
    1. user confirms "confirm_cctp_deposit" dialog
    2. user confirms "approve_token" dialog
    3. token approval tx is successful
`, async () => {
  const mockTxRequest = {
    to: '2',
    data: '3',
    value: 1
  }

  const generator = stepGeneratorForCctp({
    amountBigNumber: BigNumber.from(1),
    isDepositMode: true,
    isSmartContractWallet: false,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    transferStarter: {
      requiresTokenApproval: () => true,
      approveTokenPrepareTxRequest: () => mockTxRequest
    } as unknown as BridgeTransferStarter
  })

  const step1 = await nextStep(generator)
  expectStep(step1).hasType('start')

  const step2 = await nextStep(generator)
  expectStep(step2).hasType('dialog').hasPayload('confirm_cctp_deposit')

  const step3 = await nextStep(generator, [true])
  expectStep(step3).hasType('dialog').hasPayload('approve_token')

  const step4 = await nextStep(generator, [true])
  expectStep(step4).hasType('tx').hasPayload(mockTxRequest)

  const step5 = await nextStep(generator, [{ data: {} as TransactionReceipt }])
  expectStep(step5).doesNotExist()
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
  } as UiDriverContext)

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
  } as UiDriverContext)

  const step1 = await nextStep(generator)
  expectStep(step1).hasType('start')

  const step2 = await nextStep(generator)
  expectStep(step2).hasType('dialog').hasPayload('confirm_cctp_deposit')

  const step3 = await nextStep(generator, [true])
  expectStep(step3)
    .hasType('dialog')
    .hasPayload('scw_custom_destination_address')

  const step4 = await nextStep(generator, [true])
})
