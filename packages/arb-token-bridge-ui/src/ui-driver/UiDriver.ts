import { BigNumber, providers } from 'ethers'
import { BridgeTransferStarter } from '@/token-bridge-sdk/BridgeTransferStarter'

import { DialogType } from '../components/common/Dialog2'

export type Dialog = Extract<
  DialogType,
  | 'confirm_cctp_deposit'
  | 'confirm_cctp_withdrawal'
  | 'scw_custom_destination_address'
  | 'approve_token'
>

export type UiDriverContext = {
  amountBigNumber: BigNumber
  isDepositMode: boolean
  isSmartContractWallet: boolean
  walletAddress: string
  destinationAddress?: string
  transferStarter: BridgeTransferStarter
}

export type UiDriverStep =
  | { type: 'start' } //
  | { type: 'return' }
  | { type: 'dialog'; payload: Dialog }
  | { type: 'scw_tooltip' }
  | { type: 'tx'; payload: providers.TransactionRequest }

export type UiDriverStepResultFor<TStep extends UiDriverStep> = //
  TStep extends { type: 'start' }
    ? void
    : //
    TStep extends { type: 'return' }
    ? void
    : //
    TStep extends { type: 'dialog' }
    ? boolean
    : //
    TStep extends { type: 'scw_tooltip' }
    ? void
    : //
    TStep extends { type: 'tx' }
    ? providers.TransactionReceipt
    : //
      never

export type UiDriverStepGenerator<TStep extends UiDriverStep = UiDriverStep> = (
  context: UiDriverContext
) => AsyncGenerator<TStep, void, UiDriverStepResultFor<TStep>>

export type UiDriverStepExecutor<TStep extends UiDriverStep = UiDriverStep> = (
  step: TStep
) => Promise<UiDriverStepResultFor<TStep>>

// TypeScript doesn't to the greatest job with generators
// This 2nd generator helps with types both for params and result when yielding a step
export async function* step<TStep extends UiDriverStep>(
  step: TStep
): AsyncGenerator<
  TStep,
  UiDriverStepResultFor<TStep>,
  UiDriverStepResultFor<TStep>
> {
  return yield step
}

/**
 * @returns whether there was an early return
 */
export async function drive<TStep extends UiDriverStep>(
  generator: UiDriverStepGenerator<TStep>,
  executor: UiDriverStepExecutor<TStep>,
  context: UiDriverContext
): Promise<boolean> {
  const flow = generator(context)

  let nextStep = await flow.next()

  while (!nextStep.done) {
    const step = nextStep.value

    // handle special type for early return
    if (step.type === 'return') {
      return true
    }

    // execute current step and obtain the result
    const result = await executor(step)

    // pass the result back into the generator
    nextStep = await flow.next(result)
  }

  return false
}
