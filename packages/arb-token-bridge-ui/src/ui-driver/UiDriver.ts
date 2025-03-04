export type Dialog =
  | 'cctp_deposit' //
  | 'cctp_withdrawal'

export type UiDriverContext = {
  isDepositMode: boolean
  isSmartContractWallet: boolean
}

export type UiDriverStep =
  | { type: 'start' } //
  | { type: 'return' }
  | { type: 'dialog'; payload: Dialog }

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

export async function drive<TStep extends UiDriverStep>(
  generator: UiDriverStepGenerator<TStep>,
  executor: UiDriverStepExecutor<TStep>,
  context: UiDriverContext
): Promise<void> {
  const flow = generator(context)

  let nextStep = await flow.next()

  while (!nextStep.done) {
    const step = nextStep.value

    // handle special type for early return
    if (step.type === 'return') {
      return
    }

    // execute current step and obtain the result
    const result = await executor(step)

    // pass the result back into the generator
    nextStep = await flow.next(result)
  }
}
