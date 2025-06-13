import { BigNumber, providers } from 'ethers'
import { BridgeTransferStarter } from '@/token-bridge-sdk/BridgeTransferStarter'
import { Config, SimulateContractReturnType } from '@wagmi/core'
import { Chain } from 'wagmi/chains'

import { DialogType } from '../components/common/Dialog2'
import { trackEvent } from '../util/AnalyticsUtils'
import { MergedTransaction } from '../state/app/state'

export type Dialog = Extract<
  DialogType,
  | 'confirm_cctp_deposit'
  | 'confirm_cctp_withdrawal'
  | 'scw_custom_destination_address'
  | 'approve_token'
>

export type UiDriverContext = {
  amount: string
  amountBigNumber: BigNumber
  isDepositMode: boolean
  isSmartContractWallet: boolean
  walletAddress: string
  destinationAddress?: string
  transferStarter: BridgeTransferStarter
  wagmiConfig: Config
  sourceChain: Chain
  destinationChain: Chain
  childChain: Chain
  parentChain: Chain
}

export type UiDriverStep =
  | { type: 'start' }
  | { type: 'return' }
  | { type: 'end' }
  | { type: 'dialog'; payload: Dialog }
  | { type: 'scw_tooltip' }
  | {
      type: 'tx_ethers'
      payload: {
        txRequest: providers.TransactionRequest
        txRequestLabel: string
      }
    }
  | {
      type: 'tx_wagmi'
      payload: {
        txRequest: SimulateContractReturnType
        txRequestLabel: string
      }
    }
  | {
      type: 'analytics'
      payload: {
        event: Parameters<typeof trackEvent>[0]
        properties?: Parameters<typeof trackEvent>[1]
      }
    }
  | {
      type: 'tx_history_add'
      payload: MergedTransaction
    }

export type UiDriverStepType = UiDriverStep['type']

export type UiDriverStepPayloadFor<TStepType extends UiDriverStepType> =
  Extract<UiDriverStep, { type: TStepType }> extends {
    payload: infer TPayload
  }
    ? TPayload
    : never

type Result<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: Error }

export type UiDriverStepResultFor<TStepType extends UiDriverStepType> =
  TStepType extends 'start'
    ? void
    : TStepType extends 'return'
    ? void
    : TStepType extends 'end'
    ? void
    : TStepType extends 'dialog'
    ? boolean
    : TStepType extends 'scw_tooltip'
    ? void
    : TStepType extends 'tx_ethers' | 'tx_wagmi'
    ? Result<providers.TransactionReceipt>
    : TStepType extends 'analytics'
    ? void
    : TStepType extends 'tx_history_add'
    ? void
    : never

export type UiDriverStepGenerator<TStep extends UiDriverStep = UiDriverStep> = (
  context: UiDriverContext
) => AsyncGenerator<TStep, void, UiDriverStepResultFor<TStep['type']>>

export type UiDriverStepExecutor<TStep extends UiDriverStep = UiDriverStep> = (
  context: UiDriverContext,
  step: TStep
) => Promise<UiDriverStepResultFor<TStep['type']>>

// TypeScript doesn't to the greatest job with generators
// This 2nd generator helps with types both for params and result when yielding a step
export async function* step<TStep extends UiDriverStep>(
  step: TStep
): AsyncGenerator<
  TStep,
  UiDriverStepResultFor<TStep['type']>,
  UiDriverStepResultFor<TStep['type']>
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
    const result = await executor(context, step)

    // pass the result back into the generator
    nextStep = await flow.next(result)
  }

  return false
}
