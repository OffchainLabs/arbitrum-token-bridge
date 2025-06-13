import { providers } from 'ethers'

import {
  step,
  UiDriverStep,
  UiDriverStepPayloadFor,
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
) => AsyncGenerator<TStep, void, UiDriverStepResultFor<TStep['type']>>

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

export type UiDriverStepGeneratorForTransactionEthers<
  TStep extends UiDriverStep = UiDriverStep
> = (
  context: UiDriverContext,
  payload: UiDriverStepPayloadFor<'tx_ethers'>
) => AsyncGenerator<
  TStep,
  providers.TransactionReceipt | void,
  UiDriverStepResultFor<TStep['type']>
>

export const stepGeneratorForTransactionEthers: UiDriverStepGeneratorForTransactionEthers =
  async function* (context, payload) {
    if (context.isSmartContractWallet) {
      yield* step({ type: 'scw_tooltip' })
    }

    const { error, data } = yield* step({ type: 'tx_ethers', payload })

    if (typeof error !== 'undefined') {
      yield* step({ type: 'return' })
    } else {
      return data
    }
  }

export type UiDriverStepGeneratorForTransactionWagmi<
  TStep extends UiDriverStep = UiDriverStep
> = (
  context: UiDriverContext,
  payload: UiDriverStepPayloadFor<'tx_wagmi'>
) => AsyncGenerator<
  TStep,
  providers.TransactionReceipt | void,
  UiDriverStepResultFor<TStep['type']>
>

export const stepGeneratorForTransactionWagmi: UiDriverStepGeneratorForTransactionWagmi =
  async function* (context, payload) {
    if (context.isSmartContractWallet) {
      yield* step({ type: 'scw_tooltip' })
    }

    const { error, data } = yield* step({ type: 'tx_wagmi', payload })

    if (typeof error !== 'undefined') {
      yield* step({ type: 'return' })
    } else {
      return data
    }
  }
