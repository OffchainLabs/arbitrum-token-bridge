import {
  createContext,
  useContext,
  useReducer,
  PropsWithChildren,
  useCallback
} from 'react'
import { ArbTokenBridgeBalances } from '../hooks/arbTokenBridge.types'

const initialState: ArbTokenBridgeBalances = {
  eth: {
    arbChainBalance: null,
    balance: null
  },
  erc20: {},
  erc721: {}
}

type SetEthBalancesPayload = ArbTokenBridgeBalances['eth']
type SetEthBalancesAction = {
  type: 'setEthBalances'
  payload: SetEthBalancesPayload
}
type SetErc20BalancesPayload = ArbTokenBridgeBalances['erc20']
type SetErc20BalancesAction = {
  type: 'setErc20Balance'
  payload: SetErc20BalancesPayload
}
type Action = SetEthBalancesAction | SetErc20BalancesAction

type BalanceContextValue = [
  ArbTokenBridgeBalances,
  (payload: SetEthBalancesPayload) => void,
  (payload: SetErc20BalancesPayload) => void
]

const BalanceContext = createContext<BalanceContextValue>([
  initialState,
  () => {},
  () => {}
])

function balanceReducer(state: ArbTokenBridgeBalances, action: Action) {
  switch (action.type) {
    case 'setEthBalances':
      return {
        ...state,
        eth: action.payload
      }
    case 'setErc20Balance':
      return {
        ...state,
        ...action.payload
      }
  }
}

function BalanceProvider({ children }: PropsWithChildren<{}>) {
  const [state, dispatch] = useReducer(balanceReducer, initialState)
  const setEthBalances = useCallback(
    ({ arbChainBalance, balance }: SetEthBalancesPayload) =>
      dispatch({
        type: 'setEthBalances',
        payload: {
          arbChainBalance,
          balance
        }
      }),
    [dispatch]
  )

  const setErc20Balances = useCallback(
    (updatedBalances: SetErc20BalancesPayload) =>
      dispatch({
        type: 'setErc20Balance',
        payload: updatedBalances
      }),
    [dispatch]
  )

  return (
    <BalanceContext.Provider value={[state, setEthBalances, setErc20Balances]}>
      {children}
    </BalanceContext.Provider>
  )
}

function useBalanceContext() {
  const context = useContext(BalanceContext)

  if (context === undefined) {
    throw new Error('useBalanceContext must be used within a BalanceProvider')
  }

  return context
}

export { BalanceProvider, useBalanceContext }
