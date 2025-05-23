import { it } from 'vitest'
import { BigNumber } from 'ethers'
import {
  TransactionRequest,
  TransactionReceipt
} from '@ethersproject/providers'
import { BridgeTransferStarter } from '@/token-bridge-sdk/BridgeTransferStarter'

import { UiDriverContext } from './UiDriver'
import { stepGeneratorForCctp } from './UiDriverCctp'
import { nextStep, expectStep } from './UiDriverTestUtils'

const mockedApproveTokenTxRequest = {
  to: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
  data: '0x095ea7b30000000000000000000000009f3b8679c73c2fef8b59b4f3444d4e156fb70aa5ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  value: BigNumber.from(0)
}

function approveTokenPayload(txRequest: TransactionRequest) {
  return {
    txRequest,
    txRequestLabel: 'stepGeneratorForCctp.approveToken'
  }
}

it(`
  context:
    isDepositMode=true
    isSmartContractWallet=false

  user actions:
    1. user rejects "confirm_cctp_deposit" dialog
`, async () => {
  const context: UiDriverContext = {
    isDepositMode: true,
    isSmartContractWallet: false
  } as UiDriverContext

  const generator = stepGeneratorForCctp(context)

  expectStep(await nextStep(generator))
    //
    .hasType('start')
  expectStep(await nextStep(generator))
    .hasType('dialog')
    .hasPayload('confirm_cctp_deposit')
  expectStep(await nextStep(generator, [false]))
    //
    .hasType('return')
})

it(`
  context:
    isDepositMode=false
    isSmartContractWallet=false

  user actions:
    1. user rejects "confirm_cctp_withdrawal" dialog
`, async () => {
  const context: UiDriverContext = {
    isDepositMode: false,
    isSmartContractWallet: false
  } as UiDriverContext

  const generator = stepGeneratorForCctp(context)

  expectStep(await nextStep(generator))
    //
    .hasType('start')
  expectStep(await nextStep(generator))
    .hasType('dialog')
    .hasPayload('confirm_cctp_withdrawal')
  expectStep(await nextStep(generator, [false]))
    //
    .hasType('return')
})

it(`
  context:
    isDepositMode=true
    isSmartContractWallet=false
    walletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    destinationAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

  additional context:
    1. token requires approval

  user actions:
    1. user confirms "confirm_cctp_deposit" dialog
    2. user rejects "approve_token" dialog
`, async () => {
  const context: UiDriverContext = {
    amountBigNumber: BigNumber.from(1),
    isDepositMode: true,
    isSmartContractWallet: false,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    transferStarter: {
      requiresTokenApproval: () => true
    } as unknown as BridgeTransferStarter
  }

  const generator = stepGeneratorForCctp(context)

  expectStep(await nextStep(generator))
    //
    .hasType('start')
  expectStep(await nextStep(generator))
    .hasType('dialog')
    .hasPayload('confirm_cctp_deposit')
  expectStep(await nextStep(generator, [true]))
    .hasType('dialog')
    .hasPayload('approve_token')
  expectStep(await nextStep(generator, [false]))
    //
    .hasType('return')
})

it(`
  context:
    isDepositMode=true
    isSmartContractWallet=false
    walletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    destinationAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

  additional context:
    1. token requires approval

  user actions:
    1. user confirms "confirm_cctp_deposit" dialog
    2. user confirms "approve_token" dialog
    3. token approval tx fails
`, async () => {
  const context: UiDriverContext = {
    amountBigNumber: BigNumber.from(1),
    isDepositMode: true,
    isSmartContractWallet: false,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    transferStarter: {
      requiresTokenApproval: () => true,
      approveTokenPrepareTxRequest: () => mockedApproveTokenTxRequest
    } as unknown as BridgeTransferStarter
  }

  const generator = stepGeneratorForCctp(context)

  expectStep(await nextStep(generator))
    //
    .hasType('start')
  expectStep(await nextStep(generator))
    .hasType('dialog')
    .hasPayload('confirm_cctp_deposit')
  expectStep(await nextStep(generator, [true]))
    .hasType('dialog')
    .hasPayload('approve_token')
  expectStep(await nextStep(generator, [true]))
    .hasType('tx')
    .hasPayload(approveTokenPayload(mockedApproveTokenTxRequest))
  expectStep(await nextStep(generator, [{ error: new Error() }]))
    //
    .hasType('return')
})

it(`
  context:
    isDepositMode=true
    isSmartContractWallet=false
    walletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    destinationAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

  additional context:
    1. token requires approval

  user actions:
    1. user confirms "confirm_cctp_deposit" dialog
    2. user confirms "approve_token" dialog
    3. token approval tx is successful
`, async () => {
  const context: UiDriverContext = {
    amountBigNumber: BigNumber.from(1),
    isDepositMode: true,
    isSmartContractWallet: false,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    transferStarter: {
      requiresTokenApproval: () => true,
      approveTokenPrepareTxRequest: () => mockedApproveTokenTxRequest
    } as unknown as BridgeTransferStarter
  }

  const generator = stepGeneratorForCctp(context)

  expectStep(await nextStep(generator))
    //
    .hasType('start')
  expectStep(await nextStep(generator))
    .hasType('dialog')
    .hasPayload('confirm_cctp_deposit')
  expectStep(await nextStep(generator, [true]))
    .hasType('dialog')
    .hasPayload('approve_token')
  expectStep(await nextStep(generator, [true]))
    .hasType('tx')
    .hasPayload(approveTokenPayload(mockedApproveTokenTxRequest))
  expectStep(await nextStep(generator, [{ data: {} as TransactionReceipt }]))
    //
    .doesNotExist()
})

it(`
  context:
    isDepositMode=true
    isSmartContractWallet=false
    walletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    destinationAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

  additional context:
    1. token does not require approval

  user actions:
    1. user confirms "confirm_cctp_deposit" dialog
`, async () => {
  const context: UiDriverContext = {
    amountBigNumber: BigNumber.from(1),
    isDepositMode: true,
    isSmartContractWallet: false,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    transferStarter: {
      requiresTokenApproval: () => false,
      approveTokenPrepareTxRequest: () => mockedApproveTokenTxRequest
    } as unknown as BridgeTransferStarter
  }

  const generator = stepGeneratorForCctp(context)

  expectStep(await nextStep(generator))
    //
    .hasType('start')
  expectStep(await nextStep(generator))
    .hasType('dialog')
    .hasPayload('confirm_cctp_deposit')
  expectStep(await nextStep(generator, [true]))
    //
    .doesNotExist()
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
  const context: UiDriverContext = {
    isDepositMode: true,
    isSmartContractWallet: true,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  } as UiDriverContext

  const generator = stepGeneratorForCctp(context)

  expectStep(await nextStep(generator))
    //
    .hasType('start')
  expectStep(await nextStep(generator))
    .hasType('dialog')
    .hasPayload('confirm_cctp_deposit')
  expectStep(await nextStep(generator, [true]))
    .hasType('dialog')
    .hasPayload('scw_custom_destination_address')
  expectStep(await nextStep(generator, [false]))
    //
    .hasType('return')
})

it(`
  context:
    isDepositMode=true
    isSmartContractWallet=true
    walletAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
    destinationAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

  additional context:
    1. token requires approval

  user actions:
    1. user confirms "confirm_cctp_deposit" dialog
    2. user confirms "scw_custom_destination_address" dialog
    3. user confirms "approve_token" dialog
    4. token approval tx is successful
`, async () => {
  const context: UiDriverContext = {
    amountBigNumber: BigNumber.from(1),
    isDepositMode: true,
    isSmartContractWallet: true,
    walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    destinationAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    transferStarter: {
      requiresTokenApproval: () => true,
      approveTokenPrepareTxRequest: () => mockedApproveTokenTxRequest
    } as unknown as BridgeTransferStarter
  }

  const generator = stepGeneratorForCctp(context)

  expectStep(await nextStep(generator))
    //
    .hasType('start')
  expectStep(await nextStep(generator))
    .hasType('dialog')
    .hasPayload('confirm_cctp_deposit')
  expectStep(await nextStep(generator, [true]))
    .hasType('dialog')
    .hasPayload('scw_custom_destination_address')
  expectStep(await nextStep(generator, [true]))
    .hasType('dialog')
    .hasPayload('approve_token')
  expectStep(await nextStep(generator, [true]))
    //
    .hasType('scw_tooltip')
  expectStep(await nextStep(generator))
    .hasType('tx')
    .hasPayload(approveTokenPayload(mockedApproveTokenTxRequest))
  expectStep(await nextStep(generator, [{ data: {} as TransactionReceipt }]))
    //
    .doesNotExist()
})
