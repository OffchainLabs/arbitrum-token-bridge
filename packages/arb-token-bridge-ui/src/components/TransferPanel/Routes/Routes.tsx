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
import { Loader } from '../../common/atoms/Loader'
import { NoteBox } from '../../common/NoteBox'

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

// All route management logic has been moved to useRouteStore.useRouteManagement()

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
    // Don't auto-clear when multiple routes are available - let user choose
  }, [setSelectedRoute, routeState.eligibleRoutes])

  // Show loading state while routes are being fetched
  if (routeState.isLoading) {
    return (
      <Wrapper>
        <div className="flex items-center justify-center py-8">
          <Loader color="white" size="medium" />
          <span className="ml-3 text-white">Finding available routes...</span>
        </div>
      </Wrapper>
    )
  }

  // Show error state if there are errors
  if (routeState.error) {
    return (
      <Wrapper>
        <NoteBox variant="error" className="w-fit">
          Unable to load routes
        </NoteBox>
        <p className="flex flex-col text-sm text-white">
          There was an error loading available routes. This could be due to:
          <br /> <br />
          <ol className="list-decimal pl-6">
            <li>Network connectivity issues</li>
            <li>Temporary service unavailability</li>
            <li>Invalid input parameters</li>
          </ol>
          <br />
          Please try refreshing the page or check your connection.
        </p>
      </Wrapper>
    )
  }

  if (routeState.eligibleRoutes.length === 0) {
    return null
  }

  return (
    <Wrapper>
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
