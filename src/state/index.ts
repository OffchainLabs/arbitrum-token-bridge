import { IContext } from 'overmind'
import {
  createActionsHook,
  createStateHook,
  createEffectsHook
} from 'overmind-react'
import { namespaced } from 'overmind/config'

import * as app from './app'

export const config = namespaced({
  app: app.config
})

export type Context = IContext<{
  state: typeof config.state
  actions: typeof config.actions
  effects: typeof config.effects
}>

export const useAppState = createStateHook<Context>()
export const useActions = createActionsHook<Context>()
export const useEffects = createEffectsHook<Context>()
