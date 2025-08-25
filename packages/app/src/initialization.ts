import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timeZone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { registerCustomArbitrumNetwork } from '@arbitrum/sdk'
import { getOrbitChains } from '@/bridge/util/orbitChainsList'
import {
  mapCustomChainToNetworkData,
  getCustomChainsFromLocalStorage
} from '@/bridge/util/networks'

let arbitrumSdkInitialized = false

/**
 * This file include initialization that need to be performed on client or on server
 *
 * Server side initialization is done in src/app/(bridge)/page.tsx
 * Client side initialization is done in BridgeClient.tsx
 */

export function initializeDayjs() {
  dayjs.extend(utc)
  dayjs.extend(relativeTime)
  dayjs.extend(timeZone)
  dayjs.extend(advancedFormat)
}

export function addOrbitChainsToArbitrumSDK() {
  if (arbitrumSdkInitialized) {
    return
  }

  ;[...getOrbitChains(), ...getCustomChainsFromLocalStorage()].forEach(
    chain => {
      try {
        registerCustomArbitrumNetwork(chain)
        mapCustomChainToNetworkData(chain)
      } catch (_) {
        // already added
      }
    }
  )

  arbitrumSdkInitialized = true
}
