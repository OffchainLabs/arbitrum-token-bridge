import { L1Network, L2Network } from '@arbitrum/sdk'

export type State =
  | {
      from: L1Network
      to: L2Network
    }
  | {
      from: L2Network
      to: L1Network
    }

export type Action = { type: 'swap' }

export function reducer(state: State, action: Action) {
  switch (action.type) {
    case 'swap':
      return { ...state, from: state.to, to: state.from }

    default:
      return state
  }
}
