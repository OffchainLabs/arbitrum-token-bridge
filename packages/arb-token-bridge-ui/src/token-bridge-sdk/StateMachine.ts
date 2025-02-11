import { BigNumber } from 'ethers'

export type DefaultContext = Record<string, unknown>
export type DefaultStateType = string
export type DefaultState<C extends DefaultContext, T extends DefaultStateType> = {
  type: T
  context: C
  error?: Error
}

export type StateTransition<S extends DefaultState<DefaultContext, DefaultStateType>> = (
  state: S
) => Promise<S>

export type StateMachineDefinition<
  C extends DefaultContext,
  T extends DefaultStateType,
  S extends DefaultState<C, T>
> = {
  initialState: T
  transitions: Partial<Record<T, StateTransition<S>>>
}

export class StateMachine<
  C extends DefaultContext,
  T extends DefaultStateType,
  S extends DefaultState<C, T>
> {
  private definition: StateMachineDefinition<C, T, S>

  constructor(definition: StateMachineDefinition<C, T, S>) {
    this.definition = definition
  }

  async run(context: C): Promise<S> {
    let currentState: S = {
      type: this.definition.initialState,
      context
    } as S

    while (true) {
      const transition = this.definition.transitions[currentState.type]

      if (!transition) {
        return currentState
      }

      try {
        currentState = await transition(currentState)
      } catch (error) {
        return {
          type: 'ERROR' as T,
          context,
          error: error as Error
        } as S
      }
    }
  }
} 