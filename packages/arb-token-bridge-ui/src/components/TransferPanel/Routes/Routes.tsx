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

  const {
    setSelectedRoute,
    eligibleRoutes,
    error,
    routes,
    hasLowLiquidity,
    hasModifiedSettings
  } = useRouteStore(
    state => ({
      setSelectedRoute: state.setSelectedRoute,
      eligibleRoutes: state.eligibleRoutes,
      error: state.error,
      routes: state.routes,
      hasLowLiquidity: state.hasLowLiquidity,
      hasModifiedSettings: state.hasModifiedSettings
    }),
    shallow
  )

  // Auto-select first route if only one is available
  useEffect(() => {
    if (eligibleRoutes.length === 1) {
      const focus = eligibleRoutes[0]
      if (focus) {
        setSelectedRoute(focus)
      }
    }
  }, [setSelectedRoute, eligibleRoutes])

  if (eligibleRoutes.length === 0) {
    return null
  }

  return (
    <Wrapper>
      {/* Show warning if there are partial failures */}
      {error && (
        <div className="mb-4 rounded border border-yellow-500 bg-yellow-500/20 p-3 text-sm text-yellow-200">
          ⚠️ {error}
        </div>
      )}

      {/* Render OFT V2 route */}
      {routes.oftV2 && <OftV2Route key="oftV2" />}

      {/* Render CCTP route */}
      {routes.cctp && <CctpRoute key="cctp" />}

      {/* Render LiFi routes */}
      {routes.lifi && routes.lifi.length > 0 && <LifiRoutes key="lifi" />}

      {/* Render Arbitrum canonical route */}
      {routes.arbitrum && <ArbitrumCanonicalRoute key="arbitrum" />}

      {/* Show low liquidity message if needed */}
      {hasLowLiquidity && (
        <div className="rounded border border-lilac bg-lilac/50 p-3 text-sm text-white">
          {hasModifiedSettings ? (
            <>
              Unable to find viable routes. Consider{' '}
              <button
                onClick={() => {
                  // Open settings dialog by updating query params
                  const url = new URL(window.location.href)
                  url.searchParams.set('settingsOpen', 'true')
                  window.history.pushState({}, '', url.toString())
                  // Trigger a custom event to notify the app
                  window.dispatchEvent(new CustomEvent('openSettings'))
                }}
                className="underline hover:text-lilac/80"
              >
                updating your settings
              </button>{' '}
              or try a different amount.
            </>
          ) : (
            <>
              Low liquidity detected. Unable to find viable routes.
              <br />
              <br />
              You can try to:
              <ol className="mt-2 list-decimal pl-6">
                <li>Check back soon: Liquidity conditions can improve.</li>
                <li>Reduce your transaction amount.</li>
                <li>Consider alternative assets or destinations.</li>
              </ol>
            </>
          )}
        </div>
      )}
    </Wrapper>
  )
})

Routes.displayName = 'Routes'
