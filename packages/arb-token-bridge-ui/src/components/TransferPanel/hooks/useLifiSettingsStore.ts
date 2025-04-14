import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const defaultSlippage = '0.5'

interface LifiSettingsState {
  slippage: string
  disabledExchanges: string[]
  disabledBridges: string[]
  setSlippage: (slippage: string) => void
  disableExchange: (exchange: string) => void
  disableBridge: (bridge: string) => void
  enableExchange: (exchange: string) => void
  enableBridge: (bridge: string) => void
}

export const useLifiSettingsStore = create<LifiSettingsState>()(
  persist(
    set => ({
      slippage: defaultSlippage,
      disabledExchanges: [],
      disabledBridges: [],
      setSlippage: slippage => set({ slippage }),
      disableExchange: exchange =>
        set(state => ({
          disabledExchanges: [
            ...new Set(state.disabledExchanges.concat(exchange))
          ]
        })),
      disableBridge: bridge =>
        set(state => ({
          disabledBridges: [...new Set(state.disabledBridges.concat(bridge))]
        })),
      enableExchange: exchange =>
        set(state => ({
          disabledExchanges: state.disabledExchanges.filter(
            ex => ex !== exchange
          )
        })),
      enableBridge: bridge =>
        set(state => ({
          disabledBridges: state.disabledBridges.filter(b => b !== bridge)
        }))
    }),
    {
      name: 'lifi-settings',
      version: 1
    }
  )
)
