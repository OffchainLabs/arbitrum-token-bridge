import { PropsWithChildren, useEffect } from 'react'
import { ArbitrumCanonicalRoute } from './ArbitrumCanonicalRoute'
import { CctpRoute } from './CctpRoute'
import { OftV2Route } from './OftV2Route'
import React from 'react'
import { useRouteStore } from '../hooks/useRouteStore'
import { useRoutesUpdater } from '../hooks/useRoutesUpdater'
import { LifiRoutes } from './LifiRoute'
import { shallow } from 'zustand/shallow'
import { useMode } from '../../../hooks/useMode'
import { twMerge } from 'tailwind-merge'

function Wrapper({ children }: PropsWithChildren) {
  const { embedMode } = useMode()

  return (
    <div
      className={twMerge(
        'mb-2 flex flex-col gap-2',
        embedMode && 'overflow-auto overflow-x-hidden rounded-md pb-2'
      )}
    >
      {children}
    </div>
  )
}

export const Routes = React.memo(() => {
  // Update the store when inputs change
  useRoutesUpdater()

  const { setSelectedRoute, routeState } = useRouteStore(
    state => ({
      setSelectedRoute: state.setSelectedRoute,
      routeState: state.routeState
    }),
    shallow
  )

  // Auto-select first route if only one is available
  useEffect(() => {
    if (routeState.eligibleRoutes.length === 1) {
      const focus = routeState.eligibleRoutes[0]
      if (focus) {
        setSelectedRoute(focus)
      }
    }
  }, [setSelectedRoute, routeState.eligibleRoutes])

  if (routeState.eligibleRoutes.length === 0) {
    return null
  }

  return (
    <Wrapper>
      {/* Show warning if there are partial failures */}
      {routeState.error && (
        <div className="mb-4 rounded border border-yellow-500 bg-yellow-500/20 p-3 text-sm text-yellow-200">
          ⚠️ {routeState.error}
        </div>
      )}

      {/* Render OFT V2 route */}
      {routeState.data.oftV2 && <OftV2Route key="oftV2" />}

      {/* Render CCTP route */}
      {routeState.data.cctp && <CctpRoute key="cctp" />}

      {/* Render LiFi routes */}
      {routeState.data.lifi && routeState.data.lifi.length > 0 && (
        <LifiRoutes key="lifi" cheapestTag="best-deal" fastestTag="fastest" />
      )}

      {/* Render Arbitrum canonical route */}
      {routeState.data.arbitrum && <ArbitrumCanonicalRoute key="arbitrum" />}

      {/* Show low liquidity message if needed */}
      {routeState.flags.hasLowLiquidity && (
        <div className="rounded border border-lilac bg-lilac/50 p-3 text-sm text-white">
          Low liquidity detected. Some routes may not be available.
        </div>
      )}
    </Wrapper>
  )
})

Routes.displayName = 'Routes'
