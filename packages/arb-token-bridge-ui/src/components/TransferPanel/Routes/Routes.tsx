import { PropsWithChildren, useEffect, useState, useMemo } from 'react'
import { PlusCircleIcon } from '@heroicons/react/24/outline'
import { useNetworks } from '../../../hooks/useNetworks'
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship'
import { useIsCctpTransfer } from '../hooks/useIsCctpTransfer'
import { useIsOftV2Transfer } from '../hooks/useIsOftV2Transfer'
import { ArbitrumCanonicalRoute } from './ArbitrumCanonicalRoute'
import { CctpRoute } from './CctpRoute'
import { OftV2Route } from './OftV2Route'
import React from 'react'
import { RouteType, useRouteStore } from '../hooks/useRouteStore'
import { useArbQueryParams } from '../../../hooks/useArbQueryParams'
import { LifiRoutes } from './LifiRoute'
import { isNetwork } from '../../../util/networks'
import { shallow } from 'zustand/shallow'

function Wrapper({ children }: PropsWithChildren) {
  return <div className="mb-2 flex flex-col gap-2">{children}</div>
}

function ShowHiddenRoutesButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <div className="mt-1 flex justify-center text-xs text-white/80">
      <button className="arb-hover flex space-x-1" {...props}>
        <span>Show more routes</span>
        <PlusCircleIcon width={16} />
      </button>
    </div>
  )
}

function getRoutes({
  isOftV2Transfer,
  isCctpTransfer,
  amount,
  isDepositMode,
  isTestnet,
  showHiddenRoutes,
  setShowHiddenRoutes
}: {
  isOftV2Transfer: boolean
  isCctpTransfer: boolean
  amount: string
  isDepositMode: boolean
  isTestnet: boolean
  showHiddenRoutes: boolean
  setShowHiddenRoutes: (toggle: boolean) => void
}): {
  ChildRoutes: React.JSX.Element | null
  focus: RouteType | null
} {
  if (Number(amount) === 0) {
    return {
      ChildRoutes: null,
      focus: null
    }
  }

  if (isOftV2Transfer) {
    return {
      ChildRoutes: <OftV2Route />,
      focus: 'oftV2'
    }
  }

  if (isCctpTransfer) {
    if (isDepositMode) {
      return {
        ChildRoutes: (
          <>
            <CctpRoute />
            {showHiddenRoutes ? (
              <ArbitrumCanonicalRoute />
            ) : (
              <ShowHiddenRoutesButton
                onClick={() => setShowHiddenRoutes(true)}
              />
            )}
          </>
        ),
        focus: showHiddenRoutes ? null : 'cctp'
      }
    }

    return {
      ChildRoutes: (
        <>
          {!isTestnet && <LifiRoutes fastestTag="fastest" />}
          <CctpRoute />
        </>
      ),
      focus: isTestnet ? 'cctp' : null
    }
  }

  const showLifiRoutes = !isDepositMode && !isTestnet
  return {
    ChildRoutes: (
      <>
        {showLifiRoutes && (
          <LifiRoutes cheapestTag="best-deal" fastestTag="fastest" />
        )}
        <ArbitrumCanonicalRoute />
      </>
    ),
    focus: showLifiRoutes ? null : 'arbitrum'
  }
}

/**
 * Display CCTP routes:
 *  - Mainnet/Arb1, Sepolia/ArbSepolia
 *  - Native USDC on Arbitrum, USDC on L1
 * Display layerzero:
 *  - Mainnet/Arb1
 *  - USDT0 on Arb
 * Display canonical route for every route except:
 *  - Native USDC on Arb1
 *  - If layerzero is displayed
 *  - Arb1/ArbNova
 * Display no routes for:
 * - Arb1/ArbNova
 *
 * We memo the component, so calling `setSelectedRoute` doesn't rerender and cause infinite loop
 *
 * Tag logic:
 * LiFi + Cctp
 * - Cctp route: Best Deal
 * - Cheapest LiFi route: no tag
 * - Fastest LiFi route: Fastest
 *
 * LiFi + Canonical:
 * - Cheapest LiFi route: Best Deal
 * - Fastest LiFi route: Fastest
 * - Canonical route: Security guaranteed by Arbitrum
 *
 * Canonical + Cctp:
 * - Cctp route: Best Deal
 * - Canonical route: Security guaranteed by Arbitrum
 *
 * Canonical only: Security guaranteed by Arbitrum
 */
export const Routes = React.memo(() => {
  const [networks] = useNetworks()
  const { isDepositMode } = useNetworksRelationship(networks)
  const [{ amount }] = useArbQueryParams()
  const isCctpTransfer = useIsCctpTransfer()
  const isOftV2Transfer = useIsOftV2Transfer()

  const [showHiddenRoutes, setShowHiddenRoutes] = useState(false)

  const { isTestnet } = isNetwork(networks.sourceChain.id)
  const { setSelectedRoute, clearRoute } = useRouteStore(
    state => ({
      setSelectedRoute: state.setSelectedRoute,
      clearRoute: state.clearRoute
    }),
    shallow
  )

  const { focus, ChildRoutes } = useMemo(
    () =>
      getRoutes({
        isOftV2Transfer,
        isCctpTransfer,
        amount,
        isDepositMode,
        isTestnet,
        showHiddenRoutes,
        setShowHiddenRoutes
      }),
    [
      amount,
      isCctpTransfer,
      isDepositMode,
      isOftV2Transfer,
      isTestnet,
      showHiddenRoutes,
      setShowHiddenRoutes
    ]
  )

  useEffect(() => {
    if (focus) {
      setSelectedRoute(focus)
    } else {
      clearRoute()
      setShowHiddenRoutes(false)
    }
  }, [setSelectedRoute, focus, clearRoute, ChildRoutes])

  if (!ChildRoutes) {
    return null
  }

  return <Wrapper>{ChildRoutes}</Wrapper>
})

Routes.displayName = 'Routes'
