import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  Dispatch
} from 'react'

import { useBlockNumber } from '../../hooks/useBlockNumber'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'

type AppContextState = {
  currentL1BlockNumber: number
  layout: {
    isTransferPanelVisible: boolean
    isTransferring: boolean
    isTransactionHistoryPanelVisible: boolean
    isArbitrumStatsVisible: boolean
  }
}

const initialState: AppContextState = {
  currentL1BlockNumber: 0,
  layout: {
    isTransferPanelVisible: true,
    isTransferring: false,
    isTransactionHistoryPanelVisible: false,
    isArbitrumStatsVisible: false
  }
}

type AppContextValue = [AppContextState, Dispatch<Action>]

// eslint-disable-next-line @typescript-eslint/no-empty-function
const AppContext = createContext<AppContextValue>([initialState, () => {}])

type Action =
  | { type: 'set_current_l1_block_number'; payload: number }
  | { type: 'layout.set_is_transfer_panel_visible'; payload: boolean }
  | { type: 'layout.set_is_transferring'; payload: boolean }
  | { type: 'layout.set_txhistory_panel_visible'; payload: boolean }
  | { type: 'layout.set_arbitrumstats_panel_visible'; payload: boolean }

function reducer(state: AppContextState, action: Action) {
  switch (action.type) {
    case 'set_current_l1_block_number':
      return { ...state, currentL1BlockNumber: action.payload }

    case 'layout.set_is_transfer_panel_visible':
      return {
        ...state,
        layout: { ...state.layout, isTransferPanelVisible: action.payload }
      }

    case 'layout.set_txhistory_panel_visible':
      return {
        ...state,
        layout: {
          ...state.layout,
          isTransactionHistoryPanelVisible: action.payload
        }
      }

    case 'layout.set_arbitrumstats_panel_visible':
      return {
        ...state,
        layout: {
          ...state.layout,
          isArbitrumStatsVisible: action.payload
        }
      }

    case 'layout.set_is_transferring':
      return {
        ...state,
        layout: { ...state.layout, isTransferring: action.payload }
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

  const { l1 } = useNetworksAndSigners()
  const currentL1BlockNumber = useBlockNumber(l1.provider)

  useEffect(() => {
    dispatch({
      type: 'set_current_l1_block_number',
      payload: currentL1BlockNumber
    })
  }, [currentL1BlockNumber])

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
