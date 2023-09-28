import { createContext, useContext, useReducer, Dispatch } from 'react'

type AppContextState = {
  layout: {
    isTransferPanelVisible: boolean
    isTransferring: boolean
    isTransactionHistoryPanelVisible: boolean
    isTransactionHistoryShowingSentTx: boolean
  }
}

const initialState: AppContextState = {
  layout: {
    isTransferPanelVisible: true,
    isTransferring: false,
    isTransactionHistoryPanelVisible: false,
    isTransactionHistoryShowingSentTx: true
  }
}

type AppContextValue = [AppContextState, Dispatch<Action>]

// eslint-disable-next-line @typescript-eslint/no-empty-function
const AppContext = createContext<AppContextValue>([initialState, () => {}])

type Action =
  | { type: 'layout.set_is_transfer_panel_visible'; payload: boolean }
  | { type: 'layout.set_is_transferring'; payload: boolean }
  | { type: 'layout.set_txhistory_panel_visible'; payload: boolean }
  | { type: 'layout.set_txhistory_show_sent_tx'; payload: boolean }

function reducer(state: AppContextState, action: Action) {
  switch (action.type) {
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

    case 'layout.set_txhistory_show_sent_tx':
      return {
        ...state,
        layout: {
          ...state.layout,
          isTransactionHistoryShowingSentTx: action.payload
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

  const openTransactionHistoryPanel = () => {
    dispatch({ type: 'layout.set_txhistory_panel_visible', payload: true })
  }

  const showSentTransactions = () => {
    dispatch({ type: 'layout.set_txhistory_show_sent_tx', payload: true })
  }

  const showReceivedTransactions = () => {
    dispatch({ type: 'layout.set_txhistory_show_sent_tx', payload: false })
  }

  const closeTransactionHistoryPanel = () => {
    dispatch({ type: 'layout.set_txhistory_panel_visible', payload: false })
  }

  return {
    setTransferring,
    openTransactionHistoryPanel,
    closeTransactionHistoryPanel,
    showSentTransactions,
    showReceivedTransactions
  }
}
