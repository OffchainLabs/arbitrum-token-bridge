import { TabParamEnum } from './enum'

export const tabToIndex = {
  [TabParamEnum.BRIDGE]: 0,
  [TabParamEnum.TX_HISTORY]: 1
} as const satisfies Record<TabParamEnum, number>

export const indexToTab = {
  0: TabParamEnum.BRIDGE,
  1: TabParamEnum.TX_HISTORY
} as const satisfies Record<number, TabParamEnum>
