import { providers } from 'ethers'

import {
  step,
  UiDriverStep,
  UiDriverStepResultFor,
  UiDriverStepGenerator,
  UiDriverContext,
  Dialog
} from './UiDriver'
import { addressesEqual } from '../util/AddressUtils'

export type UiDriverStepGeneratorForDialog<
  TStep extends UiDriverStep = UiDriverStep
> = (
  dialog: Dialog
) => AsyncGenerator<TStep, void, UiDriverStepResultFor<TStep>>

export const stepGeneratorForDialog: UiDriverStepGeneratorForDialog =
  async function* (payload: Dialog) {
    const userInput = yield* step({ type: 'dialog', payload })

    if (!userInput) {
      yield* step({ type: 'return' })
    }
  }

export const stepGeneratorForSmartContractWalletDestinationDialog: UiDriverStepGenerator =
  async function* (context) {
    if (
      context.isSmartContractWallet &&
      addressesEqual(context.walletAddress, context.destinationAddress)
    ) {
      yield* stepGeneratorForDialog('scw_custom_destination_address')
    }
  }

export type UiDriverStepGeneratorForTransaction<
  TStep extends UiDriverStep = UiDriverStep
> = (
  context: UiDriverContext,
  txRequest: providers.TransactionRequest
) => AsyncGenerator<
  TStep,
  providers.TransactionReceipt,
  UiDriverStepResultFor<TStep>
>

export const stepGeneratorForTransaction: UiDriverStepGeneratorForTransaction =
  async function* (context, txRequest) {
    if (context.isSmartContractWallet) {
      yield* step({ type: 'scw_tooltip' })
    }

    // return the tx receipt
    return yield* step({ type: 'tx', payload: txRequest })
  }
