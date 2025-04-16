import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const defaultSlippage = '0.5'

interface LifiSettingsState {
  slippage: string
  disabledExchanges: string[]
  disabledBridges: string[]
  setSlippage: (slippage: string) => void
  setDisabledExchanges: (exchanges: string[]) => void
  setDisabledBridges: (bridges: string[]) => void
}

export const useLifiSettingsStore = create<LifiSettingsState>()(
  persist(
    set => ({
      slippage: defaultSlippage,
      disabledExchanges: [],
      disabledBridges: [],
      setSlippage: slippage => set({ slippage }),
      setDisabledExchanges: exchanges =>
        set({
          disabledExchanges: exchanges
        }),
      setDisabledBridges: bridges =>
        set({
          disabledBridges: bridges
        })
    }),
    {
      name: 'lifi-settings',
      version: 1
    }
  )
)
