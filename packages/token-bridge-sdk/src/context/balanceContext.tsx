import {
  createContext,
  useCallback,
  useContext,
  useState,
  PropsWithChildren
} from 'react'
import { BigNumber } from 'ethers'

type Balance = {
  [chainId: string]: BigNumber | null
}
type State = {
  [walletAddress: string]: Balance
}

type SetBalanceParams = {
  walletAddress: string
  balance: Balance
}
const BalanceContext = createContext<
  [State, (params: SetBalanceParams) => void]
>([{}, () => {}])

function BalanceContextProvider({ children }: PropsWithChildren<{}>) {
  const [balances, setBalances] = useState<State>({})

  const setBalance = useCallback(
    ({ walletAddress, balance }: SetBalanceParams) => {
      setBalances(oldBalances => ({
        ...oldBalances,
        [walletAddress]: {
          ...oldBalances[walletAddress],
          ...balance
        }
      }))
    },
    []
  )

  return (
    <BalanceContext.Provider value={[balances, setBalance]}>
      {children}
    </BalanceContext.Provider>
  )
}

function useBalanceContext() {
  const context = useContext(BalanceContext)

  if (context === undefined) {
    throw new Error(
      'useBalanceContext must be used within a BalanceContextProvider'
    )
  }

  return context
}

export { BalanceContextProvider, useBalanceContext }
