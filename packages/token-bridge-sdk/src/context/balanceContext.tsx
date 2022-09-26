import {
  createContext,
  useCallback,
  useContext,
  useState,
  PropsWithChildren
} from 'react'
import { BigNumber } from 'ethers'

type Balance = {
  [chainId: string]: {
    eth: BigNumber | null
  }
}
type State = {
  [walletAddress: string]: Balance
}

type SetBalanceParams = {
  walletAddress: string
  chainId: number
  type: 'eth'
  balance: BigNumber
}
const BalanceContext = createContext<
  [State, (params: SetBalanceParams) => void]
>([{}, () => {}])

function BalanceContextProvider({ children }: PropsWithChildren<{}>) {
  const [balances, setBalances] = useState<State>({})

  const setBalance = useCallback(
    ({ walletAddress, chainId, type, balance }: SetBalanceParams) => {
      setBalances(oldBalances => {
        return {
          ...oldBalances,
          [walletAddress]: {
            ...oldBalances[walletAddress],
            [chainId]: {
              ...oldBalances[walletAddress]?.[chainId],
              [type]: balance
            }
          }
        }
      })
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
