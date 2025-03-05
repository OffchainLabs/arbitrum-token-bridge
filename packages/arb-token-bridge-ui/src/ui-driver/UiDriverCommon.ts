import {
  step,
  UiDriverStep,
  UiDriverStepResultFor,
  UiDriverStepGenerator,
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
      return
    }
  }

export const stepGeneratorForDialogToCheckScwDestinationAddress: UiDriverStepGenerator =
  async function* (context) {
    if (
      context.isSmartContractWallet &&
      addressesEqual(context.walletAddress, context.destinationAddress)
    ) {
      yield* stepGeneratorForDialog('scw_custom_destination_address_equal')
    }
  }
