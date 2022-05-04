import { createContext, useContext } from 'react'

interface AppContextValue {
  currentL1BlockNumber: number
}

export const AppContext = createContext<AppContextValue>({
  currentL1BlockNumber: 0
})

export function useAppContext() {
  return useContext(AppContext)
}
