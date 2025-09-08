import {
  PropsWithChildren,
  useEffect,
  useMemo,
  useCallback,
  useState
} from 'react'
import { ArbitrumCanonicalRoute } from './ArbitrumCanonicalRoute'
import { CctpRoute } from './CctpRoute'
import { OftV2Route } from './OftV2Route'
import React from 'react'
import { useRouteStore } from '../hooks/useRouteStore'
import { useRoutesUpdater } from '../hooks/useRoutesUpdater'
import { LifiRoute } from './LifiRoute'
import { shallow } from 'zustand/shallow'
import { BadgeType } from './Route'
import { useNetworks } from '../../../hooks/useNetworks'
import { useSelectedToken } from '../../../hooks/useSelectedToken'
import { getTokenOverride } from '../../../app/api/crosschain-transfers/utils'
import { useMode } from '../../../hooks/useMode'
import { twMerge } from 'tailwind-merge'
import { PlusCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'

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

const MAX_ROUTES_VISIBLE = 3

export const Routes = React.memo(() => {
  useRoutesUpdater()

  const [showHiddenRoutes, setShowHiddenRoutes] = useState(false)

  const [, setQueryParams] = useArbQueryParams()

  const { eligibleRouteTypes, routes, hasLowLiquidity, hasModifiedSettings } =
    useRouteStore(
      state => ({
        eligibleRouteTypes: state.eligibleRouteTypes,
        routes: state.routes,
        hasLowLiquidity: state.hasLowLiquidity,
        hasModifiedSettings: state.hasModifiedSettings
      }),
      shallow
    )

  const [networks] = useNetworks()
  const [selectedToken] = useSelectedToken()
  const overrideToken = useMemo(
    () =>
      getTokenOverride({
        sourceChainId: networks.sourceChain.id,
        fromToken: selectedToken?.address,
        destinationChainId: networks.destinationChain.id
      }),
    [
      selectedToken?.address,
      networks.sourceChain.id,
      networks.destinationChain.id
    ]
  )

  useEffect(() => {
    setShowHiddenRoutes(false)
  }, [selectedToken])

  const getRouteTag = useCallback(
    (routeType: string): BadgeType | undefined => {
      switch (routeType) {
        case 'cctp':
          // Tag as "Best Deal" when shown with LiFi routes OR when shown with Canonical
          if (
            eligibleRouteTypes.includes('lifi') ||
            eligibleRouteTypes.includes('arbitrum')
          ) {
            return 'best-deal'
          }
          return undefined

        case 'arbitrum':
          // Always show "Security guaranteed by Arbitrum" for security
          return 'security-guaranteed'

        case 'lifi-cheapest':
          if (eligibleRouteTypes.includes('cctp')) {
            // LiFi + CCTP: CCTP = "Best Deal", Cheapest LiFi = no tag
            return undefined
          } else {
            // LiFi only: Show "best deal"
            // LiFi + Canonical: Cheapest LiFi = "Best Deal"
            return 'best-deal'
          }

        case 'lifi-fastest':
          // Fastest always gets "fastest" tag
          return 'fastest'

        case 'lifi':
          // Single LiFi route (when fastest and cheapest are the same)
          if (eligibleRouteTypes.includes('cctp')) {
            // LiFi + CCTP: CCTP = "Best Deal", LiFi = 'fastest'
            return 'fastest'
          } else {
            // LiFi only: Show "best deal"
            // LiFi + Canonical: LiFi = "Best Deal"
            return 'best-deal'
          }

        default:
          return undefined
      }
    },
    [eligibleRouteTypes]
  )

  if (eligibleRouteTypes.length === 0) {
    return null
  }

  const visibleRoutes = showHiddenRoutes
    ? routes
    : routes.slice(0, MAX_ROUTES_VISIBLE)
  const hasHiddenRoutes = routes.length > MAX_ROUTES_VISIBLE

  return (
    <Wrapper>
      {visibleRoutes.map((route, index) => {
        const tag = getRouteTag(route.type)

        switch (route.type) {
          case 'oftV2':
            return <OftV2Route key={`oftV2-${index}`} />
          case 'cctp':
            return <CctpRoute key={`cctp-${index}`} />
          case 'lifi':
          case 'lifi-fastest':
          case 'lifi-cheapest':
            return (
              <LifiRoute
                key={`lifi-${index}`}
                type={route.type}
                route={route.data.route}
                tag={tag}
                overrideToken={overrideToken.destination || undefined}
              />
            )
          case 'arbitrum':
            return <ArbitrumCanonicalRoute key={`arbitrum-${index}`} />
          default:
            return null
        }
      })}

      {hasHiddenRoutes && (
        <div className="mt-1 flex justify-center text-xs text-white/80">
          <button
            className="arb-hover flex space-x-1"
            onClick={() => setShowHiddenRoutes(!showHiddenRoutes)}
          >
            <span>
              {showHiddenRoutes ? 'Show fewer routes' : 'Show more routes'}
            </span>
            {showHiddenRoutes ? (
              <MinusCircleIcon width={16} />
            ) : (
              <PlusCircleIcon width={16} />
            )}
          </button>
        </div>
      )}

      {hasLowLiquidity && (
        <div className="rounded border border-lilac bg-lilac/50 p-3 text-sm text-white">
          {hasModifiedSettings ? (
            <>
              Unable to find viable routes. Consider{' '}
              <button
                onClick={() => setQueryParams({ settingsOpen: true })}
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
