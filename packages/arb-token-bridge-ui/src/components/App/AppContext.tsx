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
  }
}

const initialState: AppContextState = {
  currentL1BlockNumber: 0,
  layout: {
    isTransferPanelVisible: true,
    isTransferring: false,
    isTransactionHistoryPanelVisible: false
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
  const { setCurrentL1BlockNumber } = useAppContextActions(dispatch) // override `dispatch` here because this is currently outside of app-context

  const { l1 } = useNetworksAndSigners()
  const currentL1BlockNumber = useBlockNumber(l1.provider)

  useEffect(() => {
    setCurrentL1BlockNumber(currentL1BlockNumber)
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

// exports actions in a more readable and succinct format
// deprecates the direct use of `dispatch` in code, unless trying to override
export const useAppContextActions = (dispatchOverride?: Dispatch<Action>) => {
  const [, dispatchContext] = useContext(AppContext)
  const dispatch = dispatchOverride ?? dispatchContext

  const setTransferring = (payload: boolean) => {
    dispatch({ type: 'layout.set_is_transferring', payload })
  }

  const setCurrentL1BlockNumber = (currentL1BlockNumber: number) => {
    dispatch({
      type: 'set_current_l1_block_number',
      payload: currentL1BlockNumber
    })
  }

  const openTransactionHistoryPanel = () => {
    dispatch({ type: 'layout.set_txhistory_panel_visible', payload: true })
  }

  const closeTransactionHistoryPanel = () => {
    dispatch({ type: 'layout.set_txhistory_panel_visible', payload: false })
  }

  return {
    setTransferring,
    setCurrentL1BlockNumber,
    openTransactionHistoryPanel,
    closeTransactionHistoryPanel
  }
}
