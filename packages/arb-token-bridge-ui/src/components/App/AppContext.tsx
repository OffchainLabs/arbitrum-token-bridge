import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  Dispatch
} from 'react'

import { useBlockNumber } from '../../hooks/useBlockNumber'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { SeenTransactionsCache } from '../../state/SeenTransactionsCache'

type AppContextState = {
  currentL1BlockNumber: number
  seenTransactions: string[]
  layout: {
    isTransferPanelVisible: boolean
  }
}

const initialState: AppContextState = {
  currentL1BlockNumber: 0,
  seenTransactions: SeenTransactionsCache.get(),
  layout: {
    isTransferPanelVisible: true
  }
}

type AppContextValue = [AppContextState, Dispatch<Action>]

const AppContext = createContext<AppContextValue>([initialState, () => {}])

type Action =
  | { type: 'set_current_l1_block_number'; payload: number }
  | { type: 'set_tx_as_seen'; payload: string }
  | { type: 'layout.set_is_transfer_panel_visible'; payload: boolean }

function reducer(state: AppContextState, action: Action) {
  switch (action.type) {
    case 'set_current_l1_block_number':
      return { ...state, currentL1BlockNumber: action.payload }

    case 'set_tx_as_seen':
      // Don't duplicate txs
      if (state.seenTransactions.includes(action.payload)) {
        return state
      }

      return {
        ...state,
        seenTransactions: [...state.seenTransactions, action.payload]
      }

    case 'layout.set_is_transfer_panel_visible':
      return {
        ...state,
        layout: { ...state.layout, isTransferPanelVisible: action.payload }
      }

    default:
      return state
  }
}

export function AppContextProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { seenTransactions } = state

  const { l1 } = useNetworksAndSigners()
  const currentL1BlockNumber = useBlockNumber(l1.provider)

  useEffect(() => {
    dispatch({
      type: 'set_current_l1_block_number',
      payload: currentL1BlockNumber
    })
  }, [currentL1BlockNumber])

  useEffect(() => {
    // Keep seen transactions cache in sync
    SeenTransactionsCache.update(seenTransactions)
  }, [seenTransactions])

  return (
    <AppContext.Provider value={[state, dispatch]}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContextState(): AppContextState {
  const [state] = useContext(AppContext)
  return state
}

export function useAppContextDispatch(): Dispatch<Action> {
  const [, dispatch] = useContext(AppContext)
  return dispatch
}
